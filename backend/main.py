import os
import uuid
import json
import re
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

import duckdb
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

# session store
sessions: dict = {}
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# app
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    sessions.clear()

app = FastAPI(title="SQL Analyst Bot", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# helpers
BLOCKED = re.compile(
    r"\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|REPLACE|ATTACH|DETACH|PRAGMA|COPY)\b",
    re.IGNORECASE,
)

def validate_sql(sql: str):
    if BLOCKED.search(sql):
        raise HTTPException(status_code=400, detail="Query contains disallowed operations.")

def extract_schema(df: pd.DataFrame, table_name: str) -> dict:
    return {
        "table_name": table_name,
        "row_count": len(df),
        "columns": [
            {
                "name": col,
                "type": str(df[col].dtype),
                "samples": [str(s) for s in df[col].dropna().head(3).tolist()]
            }
            for col in df.columns
        ]
    }

def build_system_prompt(schema: dict) -> str:
    col_lines = "\n".join(
        f"  - {c['name']} ({c['type']}) e.g. {', '.join(c['samples'])}"
        for c in schema["columns"]
    )
    return f"""You are an expert SQL analyst. The user has uploaded a dataset.

Table name: `{schema['table_name']}`
Row count: {schema['row_count']}
Columns:
{col_lines}

Rules:
1. Return ONLY a single valid DuckDB SQL SELECT query. No explanation, no markdown.
2. Use only the exact column names listed above.
3. Always use the exact table name `{schema['table_name']}`.
4. Never use DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, or TRUNCATE.
5. For date filtering use CAST or strptime if needed.
"""

def run_query(df: pd.DataFrame, table_name: str, sql: str) -> list[dict]:
    con = duckdb.connect(database=":memory:")
    con.register(table_name, df)
    result = con.execute(sql).fetchdf()
    con.close()
    return json.loads(result.to_json(orient="records", date_format="iso"))

def call_llm(messages: list[dict]) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.1,
        max_tokens=512,
    )
    return response.choices[0].message.content.strip()

def clean_sql(raw: str) -> str:
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()

# models
class QueryRequest(BaseModel):
    session_id: str
    question: str

class QueryResponse(BaseModel):
    sql: str
    columns: list[str]
    rows: list[dict]
    row_count: int
    session_id: str

class UploadResponse(BaseModel):
    session_id: str
    table_name: str
    schema_info: dict
    message: str

class InsightRequest(BaseModel):
    session_id: str

# routes
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    ext = filename.rsplit(".", 1)[-1].lower()
    contents = await file.read()

    try:
        if ext == "csv":
            from io import StringIO
            df = pd.read_csv(StringIO(contents.decode("utf-8")))
        elif ext in ("xls", "xlsx"):
            from io import BytesIO
            df = pd.read_excel(BytesIO(contents))
        elif ext == "json":
            from io import StringIO
            df = pd.read_json(StringIO(contents.decode("utf-8")))
        elif ext == "parquet":
            from io import BytesIO
            df = pd.read_parquet(BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    df.columns = [re.sub(r"[^a-zA-Z0-9_]", "_", c).strip("_") for c in df.columns]
    table_name = re.sub(r"[^a-zA-Z0-9_]", "_", filename.rsplit(".", 1)[0])[:32] or "data"
    session_id = str(uuid.uuid4())
    schema = extract_schema(df, table_name)

    sessions[session_id] = {
        "df": df,
        "table_name": table_name,
        "schema": schema,
        "history": [],
    }

    return UploadResponse(
        session_id=session_id,
        table_name=table_name,
        schema_info=schema,
        message=f"Loaded {len(df)} rows and {len(df.columns)} columns.",
    )


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please upload a file first.")

    schema = session["schema"]
    df = session["df"]
    table_name = session["table_name"]
    history = session["history"]

    system_prompt = build_system_prompt(schema)
    messages = [{"role": "system", "content": system_prompt}] + history + [
        {"role": "user", "content": req.question}
    ]

    raw_sql = call_llm(messages)
    sql = clean_sql(raw_sql)
    validate_sql(sql)

    try:
        rows = run_query(df, table_name, sql)
    except Exception as first_err:
        fix_messages = messages + [
            {"role": "assistant", "content": raw_sql},
            {"role": "user", "content": f"That query failed:\n{first_err}\nFix it and return only the corrected SQL."},
        ]
        raw_sql2 = call_llm(fix_messages)
        sql = clean_sql(raw_sql2)
        validate_sql(sql)
        try:
            rows = run_query(df, table_name, sql)
        except Exception as second_err:
            raise HTTPException(status_code=422, detail=f"Query failed after auto-fix: {second_err}")

    session["history"].append({"role": "user", "content": req.question})
    session["history"].append({"role": "assistant", "content": sql})
    session["history"] = session["history"][-20:]

    columns = list(rows[0].keys()) if rows else []
    return QueryResponse(sql=sql, columns=columns, rows=rows, row_count=len(rows), session_id=req.session_id)


@app.post("/insights")
def get_insights(req: InsightRequest):
    from insights import generate_insights
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    results = generate_insights(session["df"], session["schema"])
    return {"insights": results}


@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    sessions.pop(session_id, None)
    return {"message": "Session cleared."}


@app.get("/session/{session_id}/schema")
def get_schema(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session["schema"]