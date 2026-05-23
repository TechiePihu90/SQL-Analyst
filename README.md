# DataLens 

Ever stared at a CSV file and thought — "I just want to ask this data a question"? That's exactly why I built this.

SQL Analyst Bot lets you upload any dataset and talk to it in plain English. No SQL knowledge needed. Ask "which city had the most sales last quarter?" and it just... answers. With the actual SQL query shown right below so you know it's not making things up.

---

## What it does

You upload a file — CSV, Excel, JSON, whatever. The bot reads it, figures out the columns, and then you can start asking questions like you're talking to a data analyst.

Under the hood it's using Groq's LLaMA model to turn your question into a SQL query, running that query against your data with DuckDB, and showing you both the result and the query. The "show the query" part was important to me — I didn't want it to feel like a black box.

There's also an Insights tab. Click it and it auto-generates 3 charts from your data with a one-line business insight for each. It uses Groq to decide which charts make sense for your data, then renders them with matplotlib on the backend. No generic pie charts — it actually looks at your columns and picks something useful.

---

## Features

- **Natural language to SQL** — just type your question, get your answer
- **SQL is always shown** — you can see exactly what query ran, copy it, learn from it
- **Multi-turn conversation** — it remembers context, so follow-up questions work ("now filter that by region")
- **Auto error recovery** — if the generated SQL fails, it feeds the error back to the LLM and tries to fix it automatically
- **Business Insights tab** — 3 auto-generated charts with insights, rendered server-side with matplotlib
- **Schema sidebar** — see all your column names and types at a glance
- Supports CSV, Excel (.xlsx/.xls), JSON, and Parquet

---

## Tech stack

| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| LLM | Groq API — llama-3.3-70b-versatile |
| SQL engine | DuckDB (runs in-memory, no DB setup needed) |
| Visualization | Matplotlib + Seaborn |
| Data parsing | Pandas |


---

## Getting started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file in the backend folder:
```
GROQ_API_KEY=your_key_here
```

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and you're good to go.

---

## How it works (the interesting part)

When you upload a file, the backend reads it with pandas and extracts a schema — column names, data types, and a few sample values from each column. This schema gets injected into the LLM's system prompt every time you ask a question.

So instead of just asking "what are the top 5 products?", the LLM is actually seeing something like:

```
Table: sales_data (4820 rows)
Columns:
  - product_name (object) e.g. Widget Pro, Nano Chip, Turbo Pack
  - revenue (float64) e.g. 45200.0, 12800.0, 67400.0
  - order_date (object) e.g. 2024-01-15, 2024-02-03
```

That context is why it generates accurate column names instead of hallucinating. The sample values help it understand the format of dates, whether a field is categorical, etc.

For the Insights tab — Groq first decides what 3 charts would be most informative (bar? histogram? line over time?), then the backend renders them with matplotlib and sends back base64-encoded PNGs. The chart planning step is the clever part — it's not just defaulting to the same charts every time, it's actually reasoning about your data.

---

## Project structure

```
Data-Analyst-Bot/
├── backend/
│   ├── main.py          # FastAPI routes, session management, SQL execution
│   ├── insights.py      # Chart planning (Groq) + rendering (matplotlib)
│   ├── requirements.txt
│   └── .env
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── ChatBox.jsx       # Conversation UI + SQL display
            ├── FileUpload.jsx    # Drag and drop upload
            ├── InsightsPanel.jsx # Insights tab with chart display
            ├── ResultTable.jsx   # Data results table
            └── ResultChart.jsx   # Inline bar charts (chat view)
```

---

## API endpoints

```
POST /upload              Upload a data file, get back a session_id
POST /query               Ask a question, get SQL + results
POST /insights            Generate 3 charts with business insights
GET  /session/{id}/schema Get the schema of uploaded data
DELETE /session/{id}      Clear session from memory
GET  /health              Health check
```



