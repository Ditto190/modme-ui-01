#!/usr/bin/env python3
"""
ingest_chunks.py - Semantic Code Indexing for ChromaDB

This script ingests code chunks from pykomodo output and creates ChromaDB collections
with Google Gemini embeddings for semantic search.

Uses Google's gemini-embedding-001 model which supports:
- output_dimensionality: 768 (default), 1536, or 3072
- Task types: RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, CLASSIFICATION

Supports three ChromaDB modes:
- http: Connect to remote ChromaDB server (Part A - session storage)
- persistent: Local file-based storage (Part B - artifact)
- ephemeral: In-memory only (testing)

Usage:
    # HTTP mode (connects to ChromaDB server)
    python ingest_chunks.py --mode http --host localhost --port 8001 \
        --chunks-file output_chunks/chunks.jsonl \
        --create-collections code_index,agent_interactions

    # Persistent mode (creates local database)
    python ingest_chunks.py --mode persistent --persist-dir ./chroma_data \
        --chunks-file output_chunks/chunks.jsonl

    # With custom embedding dimensions (768, 1536, 3072)
    python ingest_chunks.py --mode persistent --persist-dir ./chroma_data \
        --chunks-file output_chunks/chunks.jsonl --embedding-dim 768

    # Ephemeral mode (in-memory, for testing)
    python ingest_chunks.py --mode ephemeral \
        --chunks-file output_chunks/chunks.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("❌ chromadb not installed. Run: pip install chromadb")
    sys.exit(1)

try:
    import google.generativeai as genai
except ImportError:
    print("❌ google-generativeai not installed. Run: pip install google-generativeai")
    sys.exit(1)


# Constants
DEFAULT_EMBEDDING_MODEL = "models/gemini-embedding-001"
DEFAULT_EMBEDDING_DIM = 768  # Supports 768, 1536, 3072
BATCH_SIZE = 100  # Process in batches for efficiency

# Task types for Gemini embeddings
TaskType = Literal[
    "RETRIEVAL_DOCUMENT",
    "RETRIEVAL_QUERY", 
    "SEMANTIC_SIMILARITY",
    "CLASSIFICATION",
    "CLUSTERING"
]


def configure_genai() -> None:
    """Configure Google Generative AI with API key from environment."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    genai.configure(api_key=api_key)
    print("✅ Google Generative AI configured")


def get_chroma_client(
    mode: str,
    host: str | None = None,
    port: int | None = None,
    persist_dir: str | None = None,
) -> chromadb.ClientAPI:
    """
    Create ChromaDB client based on mode.
    
    Args:
        mode: 'http', 'persistent', or 'ephemeral'
        host: ChromaDB server host (http mode only)
        port: ChromaDB server port (http mode only)
        persist_dir: Directory for persistent storage (persistent mode only)
    
    Returns:
        ChromaDB client instance
    """
    if mode == "http":
        if not host or not port:
            raise ValueError("http mode requires --host and --port")
        print(f"🔗 Connecting to ChromaDB server at {host}:{port}")
        return chromadb.HttpClient(host=host, port=port)
    
    elif mode == "persistent":
        if not persist_dir:
            raise ValueError("persistent mode requires --persist-dir")
        path = Path(persist_dir)
        path.mkdir(parents=True, exist_ok=True)
        print(f"💾 Using persistent ChromaDB at {path.absolute()}")
        return chromadb.PersistentClient(
            path=str(path),
            settings=Settings(anonymized_telemetry=False)
        )
    
    elif mode == "ephemeral":
        print("🧪 Using ephemeral (in-memory) ChromaDB")
        return chromadb.EphemeralClient(
            settings=Settings(anonymized_telemetry=False)
        )
    
    else:
        raise ValueError(f"Unknown mode: {mode}. Use 'http', 'persistent', or 'ephemeral'")


def embed_texts(
    texts: list[str], 
    model: str = DEFAULT_EMBEDDING_MODEL,
    task_type: TaskType = "RETRIEVAL_DOCUMENT",
    output_dimensionality: int = DEFAULT_EMBEDDING_DIM,
) -> list[list[float]]:
    """
    Generate embeddings for a list of texts using Google Gemini.
    
    Args:
        texts: List of texts to embed
        model: Embedding model name (default: gemini-embedding-001)
        task_type: Task type for optimization (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, etc.)
        output_dimensionality: Embedding dimensions (768, 1536, or 3072)
    
    Returns:
        List of embedding vectors
    """
    if not texts:
        return []
    
    embeddings = []
    
    for text in texts:
        result = genai.embed_content(
            model=model,
            content=text,
            task_type=task_type,
            output_dimensionality=output_dimensionality,
        )
        embeddings.append(result['embedding'])
    
    return embeddings


def embed_texts_batch(
    texts: list[str],
    model: str = DEFAULT_EMBEDDING_MODEL,
    task_type: TaskType = "RETRIEVAL_DOCUMENT",
    output_dimensionality: int = DEFAULT_EMBEDDING_DIM,
) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in a single batch call.
    
    Args:
        texts: List of texts to embed
        model: Embedding model name
        task_type: Task type for optimization
        output_dimensionality: Embedding dimensions (768, 1536, or 3072)
    
    Returns:
        List of embedding vectors
    """
    if not texts:
        return []
    
    result = genai.embed_content(
        model=model,
        content=texts,  # Batch mode: pass list of texts
        task_type=task_type,
        output_dimensionality=output_dimensionality,
    )
    
    return result['embedding']


def load_chunks(chunks_file: str) -> list[dict[str, Any]]:
    """
    Load code chunks from JSONL file.
    
    Args:
        chunks_file: Path to JSONL file with chunks
    
    Returns:
        List of chunk dictionaries
    """
    chunks = []
    path = Path(chunks_file)
    
    if not path.exists():
        raise FileNotFoundError(f"Chunks file not found: {chunks_file}")
    
    with open(path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                chunk = json.loads(line)
                # Ensure required fields
                if "content" not in chunk:
                    print(f"⚠️ Line {line_num}: Missing 'content' field, skipping")
                    continue
                # Add default ID if missing
                if "id" not in chunk:
                    chunk["id"] = f"chunk_{line_num}"
                chunks.append(chunk)
            except json.JSONDecodeError as e:
                print(f"⚠️ Line {line_num}: JSON parse error: {e}")
                continue
    
    print(f"📂 Loaded {len(chunks)} chunks from {chunks_file}")
    return chunks


def create_collections(
    client: chromadb.ClientAPI,
    collection_names: list[str],
    prefix: str = "",
) -> dict[str, chromadb.Collection]:
    """
    Create or get ChromaDB collections.
    
    Args:
        client: ChromaDB client
        collection_names: List of collection names to create
        prefix: Prefix to add to collection names
    
    Returns:
        Dictionary mapping collection names to Collection objects
    """
    collections = {}
    
    for name in collection_names:
        full_name = f"{prefix}{name}"
        try:
            collection = client.get_or_create_collection(
                name=full_name,
                metadata={
                    "created_at": datetime.utcnow().isoformat(),
                    "source": "ingest_chunks.py",
                    "hnsw:space": "cosine"  # Use cosine similarity
                }
            )
            collections[name] = collection
            print(f"✅ Collection '{full_name}' ready ({collection.count()} documents)")
        except Exception as e:
            print(f"❌ Failed to create collection '{full_name}': {e}")
            raise
    
    return collections


def ingest_to_collection(
    collection: chromadb.Collection,
    chunks: list[dict[str, Any]],
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    embedding_dim: int = DEFAULT_EMBEDDING_DIM,
    task_type: TaskType = "RETRIEVAL_DOCUMENT",
) -> int:
    """
    Ingest chunks into a ChromaDB collection with embeddings.
    
    Args:
        collection: ChromaDB collection
        chunks: List of chunk dictionaries
        embedding_model: Model to use for embeddings
        embedding_dim: Embedding dimensions (768, 1536, 3072)
        task_type: Task type for embedding optimization
    
    Returns:
        Number of documents ingested
    """
    if not chunks:
        print("⚠️ No chunks to ingest")
        return 0
    
    total_ingested = 0
    
    # Process in batches
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        
        # Extract fields
        ids = [chunk["id"] for chunk in batch]
        documents = [chunk["content"] for chunk in batch]
        
        # Build metadata (exclude content and id)
        metadatas = []
        for chunk in batch:
            metadata = {
                k: v for k, v in chunk.items() 
                if k not in ("id", "content") and isinstance(v, (str, int, float, bool))
            }
            # Add ingestion timestamp
            metadata["ingested_at"] = datetime.utcnow().isoformat()
            metadatas.append(metadata)
        
        # Generate embeddings with Gemini
        try:
            embeddings = embed_texts_batch(
                documents, 
                model=embedding_model,
                task_type=task_type,
                output_dimensionality=embedding_dim,
            )
        except Exception as e:
            print(f"❌ Embedding failed for batch {i // BATCH_SIZE + 1}: {e}")
            continue
        
        # Upsert to collection
        try:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            total_ingested += len(batch)
            print(f"📤 Ingested batch {i // BATCH_SIZE + 1}/{(len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch)} docs)")
        except Exception as e:
            print(f"❌ Upsert failed for batch {i // BATCH_SIZE + 1}: {e}")
            continue
    
    return total_ingested


def main():
    parser = argparse.ArgumentParser(
        description="Ingest code chunks into ChromaDB with Google Gemini embeddings"
    )
    
    # Mode selection
    parser.add_argument(
        "--mode",
        choices=["http", "persistent", "ephemeral"],
        default="persistent",
        help="ChromaDB connection mode"
    )
    
    # HTTP mode options
    parser.add_argument("--host", help="ChromaDB server host (http mode)")
    parser.add_argument("--port", type=int, help="ChromaDB server port (http mode)")
    
    # Persistent mode options
    parser.add_argument("--persist-dir", help="Directory for persistent storage")
    
    # Chunk input
    parser.add_argument(
        "--chunks-file",
        required=True,
        help="Path to JSONL file with code chunks"
    )
    
    # Collection options
    parser.add_argument(
        "--collection-prefix",
        default="",
        help="Prefix for collection names"
    )
    parser.add_argument(
        "--create-collections",
        help="Comma-separated list of collection names to create"
    )
    parser.add_argument(
        "--target-collection",
        default="code_index",
        help="Collection to ingest chunks into (default: code_index)"
    )
    
    # Embedding options
    parser.add_argument(
        "--embedding-model",
        default=DEFAULT_EMBEDDING_MODEL,
        help=f"Gemini embedding model (default: {DEFAULT_EMBEDDING_MODEL})"
    )
    parser.add_argument(
        "--embedding-dim",
        type=int,
        default=DEFAULT_EMBEDDING_DIM,
        choices=[768, 1536, 3072],
        help=f"Embedding dimensions (default: {DEFAULT_EMBEDDING_DIM})"
    )
    parser.add_argument(
        "--task-type",
        default="RETRIEVAL_DOCUMENT",
        choices=["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "SEMANTIC_SIMILARITY", "CLASSIFICATION", "CLUSTERING"],
        help="Task type for embedding optimization (default: RETRIEVAL_DOCUMENT)"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 ChromaDB Code Index Ingestion (Gemini Embeddings)")
    print("=" * 60)
    
    # Configure Google Generative AI
    try:
        configure_genai()
    except Exception as e:
        print(f"❌ Failed to configure Google GenAI: {e}")
        sys.exit(1)
    
    # Create ChromaDB client
    try:
        chroma_client = get_chroma_client(
            mode=args.mode,
            host=args.host,
            port=args.port,
            persist_dir=args.persist_dir
        )
    except Exception as e:
        print(f"❌ Failed to create ChromaDB client: {e}")
        sys.exit(1)
    
    # Create collections
    collection_names = []
    if args.create_collections:
        collection_names = [c.strip() for c in args.create_collections.split(",")]
    
    # Ensure target collection is in the list
    if args.target_collection not in collection_names:
        collection_names.append(args.target_collection)
    
    try:
        collections = create_collections(
            chroma_client,
            collection_names,
            prefix=args.collection_prefix
        )
    except Exception as e:
        print(f"❌ Failed to create collections: {e}")
        sys.exit(1)
    
    # Load chunks
    try:
        chunks = load_chunks(args.chunks_file)
    except Exception as e:
        print(f"❌ Failed to load chunks: {e}")
        sys.exit(1)
    
    # Ingest into target collection
    target = collections.get(args.target_collection)
    if not target:
        print(f"❌ Target collection '{args.target_collection}' not found")
        sys.exit(1)
    
    print(f"\n📥 Ingesting {len(chunks)} chunks into '{args.collection_prefix}{args.target_collection}'...")
    print(f"   Embedding model: {args.embedding_model}")
    print(f"   Embedding dimensions: {args.embedding_dim}")
    print(f"   Task type: {args.task_type}")
    
    ingested = ingest_to_collection(
        target,
        chunks,
        embedding_model=args.embedding_model,
        embedding_dim=args.embedding_dim,
        task_type=args.task_type,  # type: ignore
    )
    
    print("\n" + "=" * 60)
    print("✅ Ingestion Complete")
    print("=" * 60)
    print(f"   Mode: {args.mode}")
    print(f"   Embedding Model: {args.embedding_model}")
    print(f"   Embedding Dimensions: {args.embedding_dim}")
    print(f"   Collections: {', '.join(collection_names)}")
    print(f"   Chunks loaded: {len(chunks)}")
    print(f"   Documents ingested: {ingested}")
    print(f"   Final count in target: {target.count()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
