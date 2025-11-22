# uvicorn server:app --reload --port 8001
import os
# Avoid optional torchvision import path in transformers that can break on Windows CPU-only installs
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from config import GEMINI_API_KEY
from pydantic import BaseModel
from app import SimpleSummaryMemory  # import your agent graph + model
from langchain_core.messages import HumanMessage
from google import genai
import duckdb
import uuid
import tempfile
import json
from pathlib import Path
from typing import List, Dict, Any

# Latest imports for LangChain components (assume modern versions)
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from bs4 import BeautifulSoup
import requests
import importlib.util

# ---------- FastAPI ----------
app = FastAPI(title="Argo AI Agent API")
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000", "http://localhost:1420", "tauri://localhost"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Health Check Endpoint ----------
@app.get("/health")
async def health_check():
    """Health check endpoint to verify server is running and ready"""
    return {"status": "healthy", "message": "Server is running"}


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    session_id: str
    message: str
    data_path: str

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    history: list
    visualization_spec: dict | None = None

class NewSessionRequest(BaseModel):
    data_path: str


# ---------- Docs helpers ----------
def _read_jsonl(path: str) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                docs.append(json.loads(line))
            except Exception:
                continue
    return docs


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _load_module_from_path(name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(name, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot import module from {file_path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


def _clean_html(html: str) -> Dict[str, str]:
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    for tag in ["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]:
        for t in soup.find_all(tag):
            t.extract()

    title = soup.title.get_text(strip=True) if soup.title else ""
    text = " ".join(s for s in soup.stripped_strings)
    return {"title": title, "content": text}


def _embed_docs_to_chroma(data_path: str, docs: List[Dict[str, Any]], model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> int:
    data_dir = Path(data_path)
    store_dir = data_dir / "chroma_docs"
    _ensure_dir(store_dir)

    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    db = Chroma(persist_directory=str(store_dir), embedding_function=embeddings)

    # Build existing URL set for dedupe (page-level)
    existing_urls: set[str] = set()
    try:
        raw = db._collection.get(include=["metadatas"])  # type: ignore[attr-defined]
        for md in raw.get("metadatas", []) or []:
            if isinstance(md, dict) and md.get("url"):
                existing_urls.add(md.get("url"))
    except Exception:
        pass

    # Build Documents with chunking
    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
    new_documents: List[Document] = []
    for entry in docs:
        url = entry.get("url", "")
        title = entry.get("title", "")
        content = entry.get("content", "")
        if not url or not content:
            continue
        if url in existing_urls:
            continue
        for chunk in splitter.split_text(content):
            new_documents.append(
                Document(page_content=chunk, metadata={"url": url, "title": title, "source": "docs.jsonl"})
            )

    if not new_documents:
        return 0

    db.add_documents(new_documents)
    db.persist()
    return len(new_documents)

# ---------- DB Helpers ----------
def chat_history_db_path(data_path: str) -> str:
    return str(Path(data_path) / "chat_history.db")


def project_data_db_path(data_path: str) -> str:
    return str(Path(data_path) / "project_data.db")


def ensure_db_schema(data_path: str):
    """Create the required tables if they don't exist for the provided project's chat history DB."""
    db_file = chat_history_db_path(data_path)
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    with duckdb.connect(db_file) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                summary TEXT
            )
            """
        )
        conn.execute("CREATE SEQUENCE IF NOT EXISTS message_id_seq;")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER DEFAULT nextval('message_id_seq'),
                session_id VARCHAR,
                role VARCHAR,
                content TEXT,
                visualization_spec TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        # Add visualization_spec column if it doesn't exist (migration)
        try:
            conn.execute("ALTER TABLE messages ADD COLUMN visualization_spec TEXT")
        except Exception:
            # Column already exists, skip
            pass

# ---------- Helpers ----------
def new_memory():
    """Create a fresh summary memory buffer (lightweight)."""
    return SimpleSummaryMemory(max_messages=20)


def load_memory_from_db(session_id: str, data_path: str):
    memory = new_memory()
    with duckdb.connect(chat_history_db_path(data_path)) as conn:
        # Loading all past chat history
        past_msgs = conn.execute(
            "SELECT role, content FROM messages WHERE session_id=? ORDER BY created_at ASC",
            [session_id]
        ).fetchall()

        # ✅ Load summary from sessions table
        result = conn.execute(
            "SELECT summary FROM sessions WHERE id=?", [session_id]
        ).fetchone()
        summary = result[0] if result else None

    # ✅ Restore memory summary
    if summary:
        memory.moving_summary_buffer = summary  

    # ✅ Restore all messages in memory
    for role, content in past_msgs:
        if role == "user":
            memory.chat_memory.add_user_message(content)
        elif role == "assistant":
            memory.chat_memory.add_ai_message(content)

    return memory

# ---------- Endpoints ----------

@app.post("/sessions/new")
async def create_session(req: NewSessionRequest):
    ensure_db_schema(req.data_path)
    session_id = str(uuid.uuid4())
    with duckdb.connect(chat_history_db_path(req.data_path)) as conn:
        conn.execute("INSERT INTO sessions (id) VALUES (?)", [session_id])
    return {"session_id": session_id, "message": "New session created."}

@app.get("/sessions")
async def list_sessions(data_path: str):
    ensure_db_schema(data_path)
    with duckdb.connect(chat_history_db_path(data_path)) as conn:
        rows = conn.execute("SELECT id, created_at FROM sessions ORDER BY created_at DESC").fetchall()
    return {"sessions": [{"id": r[0], "created_at": str(r[1])} for r in rows]}

@app.get("/sessions/{session_id}/history")
async def get_history(session_id: str, data_path: str):
    ensure_db_schema(data_path)
    with duckdb.connect(chat_history_db_path(data_path)) as conn:
        # First check if the session exists
        session_exists = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE id=?", [session_id]
        ).fetchone()[0]
        
        if not session_exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages for the session (may be empty for new sessions)
        rows = conn.execute(
            "SELECT role, content, created_at FROM messages WHERE session_id=? ORDER BY created_at ASC",
            [session_id]
        ).fetchall()
    
    history = [{"role": r[0], "content": r[1], "created_at": str(r[2])} for r in rows]
    return {"session_id": session_id, "history": history}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, data_path: str):
    ensure_db_schema(data_path)
    with duckdb.connect(chat_history_db_path(data_path)) as conn:
        conn.execute("DELETE FROM messages WHERE session_id=?", [session_id])
        conn.execute("DELETE FROM sessions WHERE id=?", [session_id])
    return {"message": f"Session {session_id} deleted."}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    #check if session exists
    ensure_db_schema(req.data_path)
    with duckdb.connect(chat_history_db_path(req.data_path)) as conn:
        session_exists = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE id=?", [req.session_id]
        ).fetchone()[0]
    if not session_exists:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2️⃣ Load session memory (messages + summary)
    memory = load_memory_from_db(req.session_id, req.data_path)

    # 3️⃣ Overwrite the global memory in app so the agent sees it
    import app as app_module
    app_module.summary_memory = memory
    # Set the project's data DB path for the agent to query (project_data.db)
    try:
        # Use per-request context to avoid cross-request interference
        app_module.set_runtime_project_data_dir(req.data_path)
    except Exception:
        pass

    # 4️⃣ Add current user message to memory
    user_msg = HumanMessage(content=req.message)
    memory.chat_memory.add_user_message(req.message)

    # 5️⃣ Prepare conversation state for LangGraph
    conversation_state = {"messages": [user_msg]}
    final_answer = None
    visualization_spec = None

    # 6️⃣ Stream the agent
    for event in app_module.app.stream(conversation_state, {"recursion_limit": 50}):
        # Capture visualization spec from tool node, if present
        if "call_tool" in event:
            tool_payload = event["call_tool"]
            try:
                tool_messages = tool_payload.get("messages", [])
            except AttributeError:
                tool_messages = []
            for tool_msg in tool_messages:
                name = getattr(tool_msg, "name", None)
                if name == "visualization_spec":
                    try:
                        visualization_spec = json.loads(tool_msg.content) if isinstance(tool_msg.content, str) else tool_msg.content
                    except Exception:
                        # Fallback: try to coerce content to dict if already parsed or structured
                        visualization_spec = tool_msg.content if isinstance(tool_msg.content, dict) else None

        if "call_model" in event:
            last_message = event["call_model"]["messages"][-1]
            # Only final AI response, not tool calls
            if not getattr(last_message, "tool_calls", None):
                final_answer = last_message
                memory.chat_memory.add_ai_message(final_answer.content)

    if not final_answer:
        raise HTTPException(status_code=500, detail="Agent could not produce a response")

    # 7️⃣ Save messages and updated summary to DB
    with duckdb.connect(chat_history_db_path(req.data_path)) as conn:
        # Save user message
        conn.execute(
            "INSERT INTO messages (session_id, role, content, visualization_spec) VALUES (?, ?, ?, NULL)",
            [req.session_id, "user", req.message]
        )
        # Save AI response with visualization spec (if any)
        viz_spec_json = json.dumps(visualization_spec) if visualization_spec else None
        conn.execute(
            "INSERT INTO messages (session_id, role, content, visualization_spec) VALUES (?, ?, ?, ?)",
            [req.session_id, "assistant", final_answer.content, viz_spec_json]
        )
        
        # Update session summary
        conn.execute(
            "UPDATE sessions SET summary=? WHERE id=?",
            [memory.moving_summary_buffer, req.session_id]
        )

        # Reload full history for response with visualization specs
        history = conn.execute(
            "SELECT role, content, visualization_spec FROM messages WHERE session_id=? ORDER BY created_at ASC",
            [req.session_id]
        ).fetchall()

    # Build history with embedded visualization specs
    history_with_viz = []
    for r in history:
        role, content, viz_spec_json = r[0], r[1], r[2]
        # If this message has a viz spec, embed it in the content as a JSON block
        if viz_spec_json:
            try:
                viz_obj = json.loads(viz_spec_json)
                # Append viz spec as a JSON code block that the frontend parser can find
                content_with_viz = f"{content}\n\n```json\n{json.dumps(viz_obj, indent=2)}\n```"
                history_with_viz.append({"role": role, "content": content_with_viz})
            except Exception:
                # If parsing fails, just use original content
                history_with_viz.append({"role": role, "content": content})
        else:
            history_with_viz.append({"role": role, "content": content})

    return ChatResponse(
        session_id=req.session_id,
        answer=final_answer.content,
        history=history_with_viz,
        visualization_spec=visualization_spec,
    )


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    client = genai.Client(api_key=GEMINI_API_KEY)
    # Save the uploaded file to a temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    # Upload the file to Gemini
    uploaded = client.files.upload(file=tmp_path)

    # Ask Gemini to transcribe
    prompt = "Transcribe the following audio file to plain text. Return only the transcript."
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt, uploaded]
    )

    return {"transcript": response.text}


# ---------- Docs Embedding & Ingestion Endpoints ----------

@app.post("/docs/embed")
async def embed_docs(data_path: str, docs_jsonl_path: str, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """Embed a docs.jsonl file into the project's local Chroma vector DB."""
    # Runtime guard: ensure torch >= 2.6 in this server process
    try:
        import torch  # type: ignore
        # Minimal version check without external deps
        ver = getattr(torch, "__version__", "0.0.0").split("+")[0]
        parts = ver.split(".")
        major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
        minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        if (major, minor) < (2, 6):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Server is running torch {ver}. Please upgrade torch to >=2.6.0 and restart the server "
                    f"(pip install -U torch), or use a safetensors-based model."
                ),
            )
    except HTTPException:
        raise
    except Exception:
        # If torch isn't importable here, we'll continue and rely on downstream error messages
        pass
    p = Path(docs_jsonl_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"docs_jsonl_path not found: {docs_jsonl_path}")
    try:
        docs = _read_jsonl(str(p))
        added = _embed_docs_to_chroma(data_path, docs, model_name=model_name)
        store_dir = str(Path(data_path) / "chroma_docs")
        return {"message": f"Embedded {added} chunks into {store_dir}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/docs/ingest")
async def ingest_docs(url: str, data_path: str, mode: str = "static", max_depth: int = 2, max_workers: int = 10, auto_embed: bool = False, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """Crawl a documentation site, clean pages, write <data_path>/docs.jsonl, and optionally embed into Chroma."""
    root = Path(__file__).resolve().parent.parent  # .../Gaia
    parsers_dir = root / "Link Parser"
    if mode not in {"static", "dynamic"}:
        raise HTTPException(status_code=400, detail="mode must be 'static' or 'dynamic'")

    try:
        if mode == "static":
            mod = _load_module_from_path("link_parser_static", parsers_dir / "link_parser_static.py")
        else:
            mod = _load_module_from_path("link_parser_dynamic", parsers_dir / "link_parser_dynamic.py")

        # Run the async crawler to get set of links
        links: set[str] = await mod.crawl_website(url, max_depth, max_workers, [])  # type: ignore[attr-defined]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawler failed: {e}")

    # Load existing urls to avoid duplicates in docs.jsonl
    data_dir = Path(data_path)
    _ensure_dir(data_dir)
    jsonl_path = data_dir / "docs.jsonl"
    existing_urls: set[str] = set()
    if jsonl_path.exists():
        try:
            for line in jsonl_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    rec = json.loads(line)
                    if rec.get("url"):
                        existing_urls.add(rec["url"])
                except Exception:
                    pass
        except Exception:
            pass

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    saved = 0
    with open(jsonl_path, "a", encoding="utf-8") as f:
        for link in sorted(links):
            if link in existing_urls:
                continue
            try:
                r = requests.get(link, timeout=15, headers=headers)
                if r.status_code != 200:
                    continue
                ct = r.headers.get("Content-Type", "")
                if "html" not in ct:
                    continue
                cleaned = _clean_html(r.text)
                if not cleaned.get("content"):
                    continue
                rec = {"url": link, "title": cleaned.get("title", ""), "content": cleaned.get("content", "")}
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                saved += 1
            except Exception:
                continue

    embedded_chunks = 0
    if auto_embed and saved > 0:
        try:
            docs = _read_jsonl(str(jsonl_path))
            embedded_chunks = _embed_docs_to_chroma(data_path, docs, model_name=model_name)
        except Exception:
            pass

    return {
        "message": f"Saved {saved} pages to {str(jsonl_path)}" + (f" and embedded {embedded_chunks} chunks" if auto_embed else ""),
        "jsonl_path": str(jsonl_path),
        "links_found": len(links),
    }