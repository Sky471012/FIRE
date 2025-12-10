import duckdb
import os
# Avoid optional torchvision import path in transformers that can break on Windows CPU-only installs
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")
from config import GROQ_API_KEY
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode
from langgraph.graph import StateGraph, END

# Memory: we'll implement a lightweight local memory to avoid version conflicts

# New imports for structured tool schema
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from pathlib import Path
from contextvars import ContextVar

# Mutable path to the current project's data database (project_data.db), legacy fallback
DATA_DB_PATH: Optional[str] = None
# Per-request/runtime context for active project's data DB (concurrency-safe)
DATA_DB_CTX: ContextVar[Optional[str]] = ContextVar("DATA_DB_CTX", default=None)

def set_project_data_dir(data_dir: str) -> str:
    """Set the active project's data database path using the provided data directory.

    The file used is <data_dir>/project_data.db. Returns the resolved path.
    """
    global DATA_DB_PATH
    db_file = str(Path(data_dir) / "project_data.db")
    # Ensure directory exists; creating DB will be handled by DuckDB on first connect
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    DATA_DB_PATH = db_file
    # Also set in the current task context for immediate use
    DATA_DB_CTX.set(db_file)
    return db_file

def set_runtime_project_data_dir(data_dir: str) -> str:
    """Set only the per-request runtime DB path (contextvar). Does not change global DATA_DB_PATH."""
    db_file = str(Path(data_dir) / "project_data.db")
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    DATA_DB_CTX.set(db_file)
    return db_file

def _require_data_db_path() -> str:
    """Return the active project's data DB path or a helpful error."""
    ctx_path = DATA_DB_CTX.get()
    if ctx_path:
        return ctx_path
    if DATA_DB_PATH:
        return DATA_DB_PATH
    raise RuntimeError("Project data DB not set. Server must call set_runtime_project_data_dir(<data_path>) or set_project_data_dir().")


def _quote_ident(name: str) -> str:
    """Safely quote a SQL identifier for DuckDB."""
    return '"' + name.replace('"', '""') + '"'

# ===============================
# 1. SETUP: Model and Tools
# ===============================

MODEL_NAME = "openai/gpt-oss-120b"
# Enable streaming for token-by-token responses
chat_model = ChatGroq(temperature=0.7, model=MODEL_NAME, api_key=GROQ_API_KEY, streaming=True)

# --- Database Tool ---
@tool("database_query_tool")

def database_query_tool(query: str) -> dict:
    """Executes a SQL query against the DuckDB Argo float database.
    The SQL string must be passed in the 'query' field (not 'question')."""
    try:
        # Prefer dynamically set project data DB; error if not set
        db_path = _require_data_db_path()
        con = duckdb.connect(db_path)
        cursor = con.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        cursor.close()
        con.close()

        # Cast everything to str for JSON safety
        safe_rows = [[str(item) for item in row] for row in rows]
        return {"columns": column_names, "data": safe_rows}

    except Exception as e:
        return {"error": str(e)}

# --- Metadata Tools ---
@tool("list_tables_tool")
def list_tables_tool() -> dict:
    """List available tables in the active project's data database."""
    try:
        db_path = _require_data_db_path()
        con = duckdb.connect(db_path)
        cursor = con.cursor()
        cursor.execute("SHOW TABLES;")
        rows = cursor.fetchall()
        # DuckDB returns [(name,), ...] with column 'name'
        tables = [str(r[0]) for r in rows]
        cursor.close()
        con.close()
        return {"tables": tables}
    except Exception as e:
        return {"error": str(e)}


@tool("docs_retrieval_tool")
def docs_retrieval_tool(query: str) -> dict:
    """Searches the project's embedded documentation for relevant passages."""
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from pathlib import Path

    try:
        data_dir = Path(_require_data_db_path()).parent
        store_dir = data_dir / "chroma_docs"
        if not store_dir.exists():
            return {"error": "No vector store found for this project. Ingest links or embed docs to enable retrieval."}

        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        db = Chroma(persist_directory=str(store_dir), embedding_function=embeddings)
        # Use direct similarity_search to avoid API differences across LangChain versions
        docs = db.similarity_search(query, k=5)

        results = [
            {"url": d.metadata.get("url"), "content": (d.page_content or "")[:1000]}
            for d in docs
        ]
        return {"results": results}

    except Exception as e:
        return {"error": str(e)}
@tool("describe_table_tool")
def describe_table_tool(table_name: str) -> dict:
    """Describe a table's schema: columns and types for the given table name."""
    try:
        db_path = _require_data_db_path()
        con = duckdb.connect(db_path)
        cursor = con.cursor()
        # Use PRAGMA to get schema info (works well in DuckDB)
        cursor.execute("SELECT * FROM pragma_table_info(?);", [table_name])
        rows = cursor.fetchall()
        colnames = [d[0] for d in cursor.description]
        cursor.close()
        con.close()
        safe_rows = [[str(x) for x in r] for r in rows]
        return {"columns": colnames, "data": safe_rows}
    except Exception as e:
        return {"error": str(e)}


@tool("sample_rows_tool")
def sample_rows_tool(table_name: str, limit: int = 5) -> dict:
    """Return a small sample of rows from the specified table (default 5)."""
    try:
        db_path = _require_data_db_path()
        con = duckdb.connect(db_path)
        cursor = con.cursor()
        lim = max(1, min(int(limit), 100))
        cursor.execute(f"SELECT * FROM {_quote_ident(table_name)} LIMIT {lim};")
        rows = cursor.fetchall()
        colnames = [d[0] for d in cursor.description]
        cursor.close()
        con.close()
        safe_rows = [[str(x) for x in r] for r in rows]
        return {"columns": colnames, "data": safe_rows}
    except Exception as e:
        return {"error": str(e)}

# --- General Knowledge Tool ---
@tool("general_knowledge_tool")
def general_knowledge_tool(question: str) -> str:
    """Answers general knowledge questions about oceanography or other topics."""
    try:
        response = chat_model.invoke([HumanMessage(content=question)])
        return response.content
    except Exception as e:
        return f"Error: {e}"

# --- Visualization Spec Tool ---
# Define a structured schema to let the model declare the visualization plan
PlotType = Literal[
    "line_chart",
    "scatter_plot",
    "bar_graph",
    "globe_3d",
    "scatter_3d",
]


class VisualizationSpec(BaseModel):
    sql: str = Field(
        ..., description="Full SQL query string for DuckDB with literal values (no named parameters)."
    )
    plot_type: PlotType = Field(..., description="Type of plot to render.")
    x: str = Field(..., description="Column name for x-axis (e.g., 'date', 'lon', 'depth_m'). For globe_3d, this is longitude if 'lon' not specified.")
    y: List[str] = Field(..., description="One or more column names for y-axis series (e.g., ['temp_c']). For 3D charts, first element is y-axis value.")
    z: Optional[str] = Field(default=None, description="For scatter_3d: z-axis column. For globe_3d: latitude column if 'lat' not specified.")
    title: Optional[str] = Field(default=None, description="Optional plot title.")
    x_label: Optional[str] = Field(default=None, description="Optional x-axis label.")
    y_label: Optional[str] = Field(default=None, description="Optional y-axis label.")
    z_label: Optional[str] = Field(default=None, description="Optional z-axis label for 3D scatter plots.")
    color_by: Optional[str] = Field(default=None, description="Optional categorical column to color/group series.")
    facet_by: Optional[str] = Field(default=None, description="Optional column to facet by.")
    lon: Optional[str] = Field(default=None, description="For globe_3d: longitude column (uses 'x' if not specified).")
    lat: Optional[str] = Field(default=None, description="For globe_3d: latitude column (uses 'z' if not specified).")
    value: Optional[str] = Field(default=None, description="For globe_3d: value column for point size/color (uses first y column if not specified).")


@tool("visualization_spec", args_schema=VisualizationSpec)
def visualization_spec_tool(
    sql: str,
    plot_type: str,
    x: str,
    y: List[str],
    z: Optional[str] = None,
    title: Optional[str] = None,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    z_label: Optional[str] = None,
    color_by: Optional[str] = None,
    facet_by: Optional[str] = None,
    lon: Optional[str] = None,
    lat: Optional[str] = None,
    value: Optional[str] = None,
) -> dict:
    """Return a visualization plan JSON for backend execution. This tool does NOT execute SQL."""
    result = {
        "sql": sql,
        "plot_type": plot_type,
        "x": x,
        "y": y,
        "title": title,
        "x_label": x_label,
        "y_label": y_label,
        "color_by": color_by,
        "facet_by": facet_by,
    }
    # Add optional 3D parameters if provided
    if z is not None:
        result["z"] = z
    if z_label is not None:
        result["z_label"] = z_label
    if lon is not None:
        result["lon"] = lon
    if lat is not None:
        result["lat"] = lat
    if value is not None:
        result["value"] = value
    return result

# List of tools
tools = [
    database_query_tool,
    general_knowledge_tool,
    visualization_spec_tool,
    list_tables_tool,
    describe_table_tool,
    sample_rows_tool,
    docs_retrieval_tool,
]

system_prompt = f"""
You are a world-class data analyst and expert DuckDB SQL assistant for arbitrary projects.

Your goal is to help the user explore and analyze whatever data exists in the active project's database (project_data.db). The schema is not fixed and may vary widely across domains.

Core approach
- Always reason about the user's intent first: description, exploration, statistics, comparison, or visualization.
- Before writing any query against unknown tables, inspect the database:
    1) Call list_tables_tool to discover available tables.
    2) For relevant tables, call describe_table_tool to read column names and types.
    3) If helpful, call sample_rows_tool to preview a few rows.
- Only then write precise SQL using the discovered table and column names.

Querying guidance
- Prefer simple, correct SQL. Use appropriate filters, casting, and grouping.
- For aggregations (AVG, SUM, MIN, MAX, COUNT), filter out nulls for the aggregated columns.
- Add LIMIT when previewing very large tables. Avoid SELECT * on huge tables unless sampling.
- If the user request is ambiguous, ask a short targeted clarification rather than guessing table/columns.

Visualization tasks
- When the user's intent is to create a chart/plot/map, call the tool `visualization_spec` and provide a JSON spec with:
    - sql: Full SQL with literal values inlined (no named parameters).
    - plot_type: One of [line_chart, scatter_plot, bar_graph, globe_3d, scatter_3d].
        * line_chart: Time series or sequential data
        * scatter_plot: 2D scatter (numeric x vs numeric y)
        * bar_graph: Categorical comparisons
        * globe_3d: Geographic data on a 3D globe (requires lon/lat coordinates)
        * scatter_3d: 3D scatter plot (requires x, y, z numeric values)
    - x: X-axis column name (for globe_3d: longitude if 'lon' not specified).
    - y: One or more Y-axis columns (list) for series. For 3D charts, first element is the y-axis value.
    - z: Required for scatter_3d (z-axis value). For globe_3d, this is latitude if 'lat' not specified.
    - Optional: title, x_label, y_label, z_label (for 3D scatter), color_by, facet_by.
    - For globe_3d specifically:
        * lon: Longitude column (defaults to x)
        * lat: Latitude column (defaults to z)
        * value: Value for point size/color (defaults to first y column)
        * Ensure coordinates are in valid ranges: longitude [-180, 180], latitude [-90, 90]
    - For scatter_3d:
        * Must provide x, y (first element), and z columns
        * All three should be numeric values
        * Use z_label for the z-axis label
- Limit the data rows to around 5000-10000 if the user didn't mention any limit and randomize them.
- For geographic visualizations (globe_3d), prefer this when user mentions maps, locations, coordinates, latitude/longitude, or global distribution.

Tool selection
- Use list_tables_tool and describe_table_tool for schema discovery.
- Use sample_rows_tool for small previews.
- Use database_query_tool to run numeric/analytical queries.
- Use visualization_spec to define charts for the frontend.
- Use docs_retrieval_tool to search any embedded content (not only "docs") from URLs ingested into the project's vector DB.
- Use general_knowledge_tool for definitions/concepts not in the database or vector store.

Efficiency and limits
- Prefer batching when many tables are present: first list tables, then describe only those most relevant to the question.
- If there are many similarly named tables (e.g., by year), provide a grouped description instead of exhausting every table one-by-one.
- Cap initial schema introspection to ~10 tables. If the user asks for “all,” summarize groups and ask whether to go deeper on specific tables.

Stopping behavior
- Once you have enough information to answer, stop calling tools and produce the final answer.

Answering
- Present results in clear, plain language without dumping raw SQL unless asked.
- If no data or no matching tables/columns are found, say so directly and suggest next steps.
\nRetrieval and routing
- First, classify the user's question: (a) project structured data (SQL), (b) embedded content in the vector DB, (c) both, or (d) general/world knowledge.
- If the answer likely exists in the vector DB (any embedded content fetched from URLs), call `docs_retrieval_tool` with the full user query. Use the retrieved passages to ground your answer and, when useful, include the source URLs or titles.
- Strong preference: For “how to…”, “install…”, “configure…”, “API usage…”, and framework/library questions (e.g., Next.js, pandas, Docker), attempt `docs_retrieval_tool` first when a vector store may exist. If retrieval returns no/low‑quality results or an error (e.g., no vector store), then fall back to other tools.
- If the question is about the project's tables/metrics/calculations, use the DuckDB tools (list/describe/sample/query) to derive the answer.
- If both sources could be relevant, call both: retrieve passages from the vector DB and run the minimal SQL needed; then synthesize a single, concise answer.
- Avoid using `general_knowledge_tool` for documentation-like questions when `docs_retrieval_tool` is available; use general knowledge only if retrieval fails or yields nothing relevant.
- If neither the vector DB nor the project's database is relevant, use `general_knowledge_tool` and mention that the answer is based on general knowledge (not project data).
- If the vector store is missing, say that no embedded content exists yet for this project and suggest ingesting links; otherwise proceed with available sources.
"""

# ===============================
# 2. MEMORY SETUP
# ===============================
class SimpleChatMemory:
    def __init__(self):
        self.messages: list[BaseMessage] = []

    def add_user_message(self, content: str) -> None:
        self.messages.append(HumanMessage(content=content))

    def add_ai_message(self, content: str) -> None:
        self.messages.append(AIMessage(content=content))


class SimpleSummaryMemory:
    """Minimal replacement for ConversationSummaryBufferMemory used here.

    - Keeps the last N messages (no auto-summarization).
    - Exposes moving_summary_buffer for server persistence compatibility.
    - load_memory_variables returns messages under key 'history'.
    """

    def __init__(self, max_messages: int = 20):
        self.max_messages = max_messages
        self.chat_memory = SimpleChatMemory()
        self.moving_summary_buffer: str | None = None

    def load_memory_variables(self, _: dict) -> dict:
        history = self.chat_memory.messages[-self.max_messages:]
        return {"history": history}


# This maintains a rolling short history
summary_memory = SimpleSummaryMemory(max_messages=20)

# Bind tools to the model
model_with_tools = chat_model.bind_tools(tools)

# ===============================
# 3. DEFINE AGENT STATE
# ===============================
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]

# ===============================
# 4. DEFINE NODES & GRAPH
# ===============================
def call_model_node(state):
    """Call LLM to decide next actions or generate response."""
    # Inject system prompt + summarized memory + latest turn
    memory_vars = summary_memory.load_memory_variables({})
    summarized_history = memory_vars.get("history", [])
    messages = [SystemMessage(content=system_prompt)] + summarized_history + state["messages"]

    response = model_with_tools.invoke(messages)
    # print("\n--- Model raw response ---")
    # print(response)
    # print("---\n")
    return {"messages": [response]}

tool_node = ToolNode(tools)

def should_continue(state):
    """Decide whether to continue tool calls or finish."""
    last_message = state["messages"][-1]
    return "continue" if getattr(last_message, "tool_calls", None) else "end"

workflow = StateGraph(AgentState)
workflow.add_node("call_model", call_model_node)
workflow.add_node("call_tool", tool_node)
workflow.set_entry_point("call_model")
workflow.add_conditional_edges(
    "call_model", should_continue, {"continue": "call_tool", "end": END}
)
workflow.add_edge("call_tool", "call_model")
app = workflow.compile()

# ===============================
# 5. CHAT LOOP
# ===============================
def run_chat(): 
    print("--- 🚀 Argo AI Agent ---")
    print("Ask questions about Argo data. Type 'exit' to quit.")

    # We'll store only the *latest turn* in state, summaries come from memory
    conversation_state = {"messages": []}

    while True:
        user_question = input("\n> ")
        if user_question.lower() == "exit":
            break

        # Save user input to memory
        summary_memory.chat_memory.add_user_message(user_question)

        conversation_state["messages"] = [HumanMessage(content=user_question)]

        print("\n--- Agent Thinking... ---")
        final_answer = None

        for event in app.stream(conversation_state, {"recursion_limit": 50}):
            for key, value in event.items():
                print(f"Node '{key}':\n{value}\n---")

            if "call_model" in event:
                last_message = event["call_model"]["messages"][-1]
                if not getattr(last_message, "tool_calls", None):
                    final_answer = last_message
                    # Save AI response to memory
                    summary_memory.chat_memory.add_ai_message(final_answer.content)

        print("\n--- ✅ Final Answer ---")
        if final_answer:
            print(final_answer.content)
        else:
            print("The agent could not generate a final answer.")


if __name__ == "__main__":
    # Default to the workspace's data folder so docs retrieval finds chroma_docs
    set_project_data_dir("C:/Data/Python Files/Gaia/Visualization Tools/data")
    run_chat()
