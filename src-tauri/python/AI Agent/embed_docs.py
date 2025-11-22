"""
CLI helper to embed a docs.jsonl file into a project's local Chroma store.
Usage (PowerShell):
  python embed_docs.py --data_path "<project_path>" --docs_jsonl "<path_to_docs.jsonl>" [--model_name hkunlp/instructor-large]
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import List, Dict, Any

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


def read_jsonl(path: str) -> List[Dict[str, Any]]:
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


def embed_docs_to_chroma(data_path: str, docs: List[Dict[str, Any]], model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> int:
    data_dir = Path(data_path)
    store_dir = data_dir / "chroma_docs"
    store_dir.mkdir(parents=True, exist_ok=True)

    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    db = Chroma(persist_directory=str(store_dir), embedding_function=embeddings)

    # Build existing URL set
    existing_urls: set[str] = set()
    try:
        raw = db._collection.get(include=["metadatas"])  # type: ignore[attr-defined]
        for md in raw.get("metadatas", []) or []:
            if isinstance(md, dict) and md.get("url"):
                existing_urls.add(md.get("url"))
    except Exception:
        pass

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_path", required=True, help="Path to the project folder containing project_data.db")
    ap.add_argument("--docs_jsonl", required=True, help="Path to docs.jsonl to embed")
    ap.add_argument("--model_name", default="sentence-transformers/all-MiniLM-L6-v2", help="Embedding model to use (default: all-MiniLM-L6-v2)")
    args = ap.parse_args()

    jsonl_path = Path(args.docs_jsonl)
    if not jsonl_path.exists():
        raise SystemExit(f"docs_jsonl not found: {jsonl_path}")

    docs = read_jsonl(str(jsonl_path))
    added = embed_docs_to_chroma(args.data_path, docs, model_name=args.model_name)
    print(f"Embedded {added} chunks into {Path(args.data_path) / 'chroma_docs'}")


if __name__ == "__main__":
    main()
