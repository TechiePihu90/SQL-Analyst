import os
import json
import base64
import io
from groq import Groq
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import numpy as np

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

CHART_STYLE = {
    "figure.facecolor": "#0d0f12",
    "axes.facecolor": "#13161b",
    "axes.edgecolor": "#2a2f3a",
    "axes.labelcolor": "#8b92a0",
    "xtick.color": "#555d6b",
    "ytick.color": "#555d6b",
    "text.color": "#e8eaf0",
    "grid.color": "#1a1e25",
    "grid.linestyle": "--",
    "grid.alpha": 0.6,
    "font.family": "monospace",
    "axes.spines.top": False,
    "axes.spines.right": False,
}

ACCENT_COLORS = ["#4f9eff", "#3dd68c", "#f5a623", "#ff5a5a", "#c084fc", "#fb923c"]


def fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=140, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def ask_groq_for_plan(schema: dict, sample_rows: list) -> dict:
    prompt = f"""
You are a data analyst. Given this dataset schema and sample rows, suggest exactly 3 charts that reveal the most useful business insights.

Schema:
Table: {schema['table_name']}
Columns: {json.dumps([{'name': c['name'], 'type': c['type'], 'samples': c['samples']} for c in schema['columns']], indent=2)}

Sample rows (first 5):
{json.dumps(sample_rows[:5], indent=2)}

Return ONLY a JSON array (no markdown, no explanation) with exactly 3 objects. Each object must have:
- "chart_type": one of ["bar", "line", "histogram", "scatter", "pie", "heatmap", "box"]
- "title": short descriptive title
- "x_col": column name for x-axis (must exist in schema)
- "y_col": column name for y-axis or aggregation target (must exist, or null for histogram)
- "agg": one of ["sum", "mean", "count", "none"] 
- "insight": one sentence business insight this chart will reveal
- "top_n": integer (10 for bar/pie, 0 for others)

Only use column names that actually exist in the schema above.
"""
    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=800,
    )
    raw = resp.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def generate_chart(df: pd.DataFrame, plan: dict) -> str | None:
    chart_type = plan.get("chart_type", "bar")
    x_col = plan.get("x_col")
    y_col = plan.get("y_col")
    agg = plan.get("agg", "none")
    top_n = int(plan.get("top_n", 0))
    title = plan.get("title", "Chart")

    
    if x_col and x_col not in df.columns:
        return None
    if y_col and y_col not in df.columns:
        return None

    with plt.rc_context(CHART_STYLE):
        fig, ax = plt.subplots(figsize=(8, 4.5))
        fig.patch.set_facecolor("#0d0f12")

        try:
            if chart_type == "bar":
                if agg == "count":
                    data = df[x_col].value_counts()
                elif agg in ("sum", "mean") and y_col:
                    data = df.groupby(x_col)[y_col].agg(agg).sort_values(ascending=False)
                else:
                    data = df.set_index(x_col)[y_col] if y_col else df[x_col].value_counts()

                if top_n:
                    data = data.head(top_n)
                bars = ax.bar(range(len(data)), data.values, color=ACCENT_COLORS[0], width=0.65, zorder=3)
                ax.set_xticks(range(len(data)))
                ax.set_xticklabels(
                    [str(l)[:18] for l in data.index],
                    rotation=35, ha="right", fontsize=9
                )
                ax.yaxis.set_major_formatter(mticker.FuncFormatter(
                    lambda v, _: f"{v/1e6:.1f}M" if v >= 1e6 else f"{v/1e3:.0f}k" if v >= 1e3 else str(int(v))
                ))
                ax.grid(axis="y", zorder=0)

            elif chart_type == "line":
                if agg in ("sum", "mean") and y_col:
                    data = df.groupby(x_col)[y_col].agg(agg)
                else:
                    data = df.set_index(x_col)[y_col] if y_col else df[x_col].value_counts().sort_index()
                ax.plot(range(len(data)), data.values, color=ACCENT_COLORS[0],
                        linewidth=2, marker="o", markersize=4)
                ax.fill_between(range(len(data)), data.values, alpha=0.1, color=ACCENT_COLORS[0])
                ax.set_xticks(range(len(data)))
                ax.set_xticklabels([str(l)[:14] for l in data.index], rotation=35, ha="right", fontsize=9)
                ax.grid(axis="y", zorder=0)

            elif chart_type == "histogram":
                col = y_col or x_col
                nums = pd.to_numeric(df[col], errors="coerce").dropna()
                ax.hist(nums, bins=25, color=ACCENT_COLORS[0], edgecolor="#0d0f12", linewidth=0.5, zorder=3)
                ax.set_xlabel(col, fontsize=10)
                ax.grid(axis="y", zorder=0)

            elif chart_type == "scatter":
                if not (x_col and y_col):
                    return None
                xs = pd.to_numeric(df[x_col], errors="coerce")
                ys = pd.to_numeric(df[y_col], errors="coerce")
                mask = xs.notna() & ys.notna()
                ax.scatter(xs[mask], ys[mask], color=ACCENT_COLORS[0],
                           alpha=0.55, s=22, edgecolors="none", zorder=3)
                ax.set_xlabel(x_col, fontsize=10)
                ax.set_ylabel(y_col, fontsize=10)
                ax.grid(zorder=0)

            elif chart_type == "pie":
                if agg == "count":
                    data = df[x_col].value_counts()
                elif agg in ("sum", "mean") and y_col:
                    data = df.groupby(x_col)[y_col].agg(agg)
                else:
                    data = df[x_col].value_counts()
                if top_n:
                    data = data.head(top_n)
                colors = (ACCENT_COLORS * 4)[:len(data)]
                wedges, texts, autotexts = ax.pie(
                    data.values, labels=[str(l)[:16] for l in data.index],
                    colors=colors, autopct="%1.1f%%",
                    pctdistance=0.82, startangle=140,
                    wedgeprops={"edgecolor": "#0d0f12", "linewidth": 1.5}
                )
                for t in texts:
                    t.set_fontsize(8)
                    t.set_color("#8b92a0")
                for t in autotexts:
                    t.set_fontsize(7.5)
                    t.set_color("#e8eaf0")

            elif chart_type == "box":
                col = y_col or x_col
                nums = pd.to_numeric(df[col], errors="coerce").dropna()
                bp = ax.boxplot(nums, patch_artist=True,
                                medianprops={"color": ACCENT_COLORS[1], "linewidth": 2})
                bp["boxes"][0].set_facecolor(f"{ACCENT_COLORS[0]}40")
                bp["boxes"][0].set_edgecolor(ACCENT_COLORS[0])
                ax.set_xticklabels([col])
                ax.grid(axis="y", zorder=0)

            else:
                return None

        except Exception as e:
            plt.close(fig)
            return None

        ax.set_title(title, fontsize=12, pad=10, color="#e8eaf0", fontweight="normal")
        fig.tight_layout(pad=1.2)
        return fig_to_base64(fig)


def generate_insights(df: pd.DataFrame, schema: dict) -> list[dict]:
    sample = json.loads(df.head(5).to_json(orient="records"))
    
    try:
        plans = ask_groq_for_plan(schema, sample)
    except Exception as e:
        return [{"error": f"Could not generate insight plan: {e}"}]

    results = []
    for plan in plans[:3]:
        img_b64 = generate_chart(df, plan)
        results.append({
            "title": plan.get("title", "Chart"),
            "insight": plan.get("insight", ""),
            "chart_type": plan.get("chart_type"),
            "image_b64": img_b64,
        })

    return results