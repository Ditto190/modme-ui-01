#!/usr/bin/env python3
"""
session_memory.py - In-Session Memory Store Manager

This module provides an in-session memory store for tracking environment state
and updating agents as they interact. It acts as a shared context layer between
the Python ADK agent and the React frontend via CopilotKit.

Uses Google's gemini-embedding-001 model which supports:
- output_dimensionality: 768 (default), 1536, or 3072
- Task types: RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY

Part B of the dual ChromaDB architecture:
- Tracks environment state changes
- Stores agent interaction context
- Caches tool execution results
- Provides semantic search over session history

Usage:
    # As a module
    from session_memory import SessionMemory
    
    memory = SessionMemory()
    memory.store_interaction("user_query", "Generate a dashboard", {"intent": "create"})
    memory.store_state_change("elements", [{"id": "card1", "type": "StatCard"}])
    
    results = memory.search_context("dashboard creation")

    # As a standalone server (for MCP integration)
    python session_memory.py --serve --port 8002
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
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
DEFAULT_PERSIST_DIR = "./.session_memory"

# Task types for Gemini embeddings
TaskType = Literal[
    "RETRIEVAL_DOCUMENT",
    "RETRIEVAL_QUERY", 
    "SEMANTIC_SIMILARITY",
    "CLASSIFICATION",
    "CLUSTERING"
]

# Collection names for session memory
COLLECTIONS = {
    "interactions": "agent_interactions",      # User queries and agent responses
    "state": "environment_state",              # Current environment configuration
    "context": "agent_context",                # Agent context and reasoning traces
    "tools": "tool_outputs",                   # Tool execution results
    "observations": "session_observations",    # Key observations and insights
}


class SessionMemory:
    """
    In-session memory store for agent state tracking.
    
    Uses ChromaDB to provide:
    - Semantic search over session history
    - State persistence within session lifetime
    - Context sharing between agents
    
    Uses Google Gemini embeddings (gemini-embedding-001) with configurable dimensions.
    """
    
    def __init__(
        self,
        mode: Literal["http", "persistent", "ephemeral"] = "persistent",
        host: str | None = None,
        port: int | None = None,
        persist_dir: str | None = None,
        session_id: str | None = None,
        embedding_dim: int = DEFAULT_EMBEDDING_DIM,
    ):
        """
        Initialize session memory.
        
        Args:
            mode: ChromaDB mode ('http', 'persistent', 'ephemeral')
            host: HTTP server host (http mode)
            port: HTTP server port (http mode)
            persist_dir: Persistence directory (persistent mode)
            session_id: Unique session identifier
            embedding_dim: Embedding dimensions (768, 1536, 3072)
        """
        self.mode = mode
        self.session_id = session_id or str(uuid.uuid4())[:8]
        self.created_at = datetime.utcnow().isoformat()
        self.embedding_dim = embedding_dim
        
        # Initialize ChromaDB client
        if mode == "http":
            self.client = chromadb.HttpClient(
                host=host or "localhost",
                port=port or 8001
            )
        elif mode == "persistent":
            path = persist_dir or DEFAULT_PERSIST_DIR
            os.makedirs(path, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=path,
                settings=Settings(anonymized_telemetry=False)
            )
        else:  # ephemeral
            self.client = chromadb.EphemeralClient(
                settings=Settings(anonymized_telemetry=False)
            )
        
        # Initialize Google Generative AI for embeddings
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.genai_configured = True
        else:
            print("⚠️ GOOGLE_API_KEY not set, embeddings will be disabled")
            self.genai_configured = False
        
        # Initialize collections
        self.collections = self._init_collections()
        
        print(f"✅ SessionMemory initialized (mode={mode}, session={self.session_id}, embedding_dim={embedding_dim})")
    
    def _init_collections(self) -> dict[str, chromadb.Collection]:
        """Create or get all session collections."""
        result = {}
        for key, name in COLLECTIONS.items():
            full_name = f"session_{self.session_id}_{name}"
            result[key] = self.client.get_or_create_collection(
                name=full_name,
                metadata={
                    "session_id": self.session_id,
                    "created_at": self.created_at,
                    "type": key,
                }
            )
        return result
    
    def _embed(self, text: str, task_type: TaskType = "RETRIEVAL_DOCUMENT") -> list[float] | None:
        """
        Generate embedding for text using Google Gemini.
        
        Args:
            text: Text to embed
            task_type: Task type for embedding optimization
        
        Returns:
            Embedding vector or None if embedding is disabled
        """
        if not self.genai_configured:
            return None
        try:
            result = genai.embed_content(
                model=DEFAULT_EMBEDDING_MODEL,
                content=text,
                task_type=task_type,
                output_dimensionality=self.embedding_dim,
            )
            return result['embedding']
        except Exception as e:
            print(f"⚠️ Embedding failed: {e}")
            return None
    
    def _embed_query(self, text: str) -> list[float] | None:
        """
        Generate embedding for a search query (optimized for retrieval).
        
        Args:
            text: Query text to embed
        
        Returns:
            Embedding vector or None if embedding is disabled
        """
        return self._embed(text, task_type="RETRIEVAL_QUERY")
    
    def store_interaction(
        self,
        interaction_type: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """
        Store an agent interaction.
        
        Args:
            interaction_type: Type of interaction (user_query, agent_response, tool_call)
            content: The interaction content
            metadata: Additional metadata
        
        Returns:
            Document ID
        """
        doc_id = f"{interaction_type}_{datetime.utcnow().timestamp()}"
        meta = metadata or {}
        meta.update({
            "type": interaction_type,
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
        })
        
        embedding = self._embed(content)
        
        self.collections["interactions"].upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[meta],
            embeddings=[embedding] if embedding else None,
        )
        
        return doc_id
    
    def store_state_change(
        self,
        state_key: str,
        state_value: Any,
        previous_value: Any | None = None,
    ) -> str:
        """
        Store an environment state change.
        
        Args:
            state_key: The state key that changed
            state_value: New state value
            previous_value: Previous state value (for diff tracking)
        
        Returns:
            Document ID
        """
        doc_id = f"state_{state_key}_{datetime.utcnow().timestamp()}"
        
        # Serialize state for storage
        content = json.dumps({
            "key": state_key,
            "value": state_value,
            "previous": previous_value,
        }, default=str)
        
        metadata = {
            "state_key": state_key,
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "has_previous": previous_value is not None,
        }
        
        self.collections["state"].upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[metadata],
        )
        
        return doc_id
    
    def store_tool_output(
        self,
        tool_name: str,
        inputs: dict[str, Any],
        output: Any,
        success: bool = True,
    ) -> str:
        """
        Store a tool execution result.
        
        Args:
            tool_name: Name of the tool
            inputs: Tool input parameters
            output: Tool output
            success: Whether the tool succeeded
        
        Returns:
            Document ID
        """
        doc_id = f"tool_{tool_name}_{datetime.utcnow().timestamp()}"
        
        content = json.dumps({
            "tool": tool_name,
            "inputs": inputs,
            "output": output,
            "success": success,
        }, default=str)
        
        metadata = {
            "tool_name": tool_name,
            "success": success,
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
        }
        
        embedding = self._embed(f"{tool_name}: {json.dumps(inputs)}")
        
        self.collections["tools"].upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[metadata],
            embeddings=[embedding] if embedding else None,
        )
        
        return doc_id
    
    def store_observation(
        self,
        observation: str,
        category: str = "general",
        importance: int = 1,
    ) -> str:
        """
        Store a key observation or insight.
        
        Args:
            observation: The observation text
            category: Category (general, error, warning, success)
            importance: Importance level (1-5)
        
        Returns:
            Document ID
        """
        doc_id = f"obs_{category}_{datetime.utcnow().timestamp()}"
        
        metadata = {
            "category": category,
            "importance": importance,
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
        }
        
        embedding = self._embed(observation)
        
        self.collections["observations"].upsert(
            ids=[doc_id],
            documents=[observation],
            metadatas=[metadata],
            embeddings=[embedding] if embedding else None,
        )
        
        return doc_id
    
    def search_context(
        self,
        query: str,
        collection: str = "interactions",
        n_results: int = 5,
        where: dict | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search session memory for relevant context.
        
        Args:
            query: Search query
            collection: Which collection to search
            n_results: Number of results to return
            where: Optional filter conditions
        
        Returns:
            List of matching documents with metadata
        """
        if collection not in self.collections:
            raise ValueError(f"Unknown collection: {collection}")
        
        coll = self.collections[collection]
        
        # Try semantic search first (use query-optimized embedding)
        embedding = self._embed_query(query)
        
        try:
            if embedding:
                results = coll.query(
                    query_embeddings=[embedding],
                    n_results=n_results,
                    where=where,
                    include=["documents", "metadatas", "distances"],
                )
            else:
                # Fallback to text search
                results = coll.query(
                    query_texts=[query],
                    n_results=n_results,
                    where=where,
                    include=["documents", "metadatas", "distances"],
                )
        except Exception as e:
            print(f"⚠️ Search failed: {e}")
            return []
        
        # Format results
        formatted = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                formatted.append({
                    "document": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else None,
                })
        
        return formatted
    
    def get_recent_interactions(self, limit: int = 10) -> list[dict[str, Any]]:
        """Get the most recent interactions."""
        coll = self.collections["interactions"]
        
        # Get all and sort by timestamp
        results = coll.get(
            include=["documents", "metadatas"],
            limit=limit,
        )
        
        items = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"]):
                items.append({
                    "document": doc,
                    "metadata": results["metadatas"][i] if results["metadatas"] else {},
                })
        
        # Sort by timestamp descending
        items.sort(
            key=lambda x: x.get("metadata", {}).get("timestamp", ""),
            reverse=True
        )
        
        return items[:limit]
    
    def get_current_state(self) -> dict[str, Any]:
        """Get the current environment state (most recent values for each key)."""
        coll = self.collections["state"]
        
        results = coll.get(include=["documents", "metadatas"])
        
        # Build state dict with most recent value for each key
        state = {}
        if results["documents"]:
            entries = []
            for i, doc in enumerate(results["documents"]):
                meta = results["metadatas"][i] if results["metadatas"] else {}
                entries.append({
                    "document": doc,
                    "metadata": meta,
                })
            
            # Sort by timestamp
            entries.sort(
                key=lambda x: x.get("metadata", {}).get("timestamp", ""),
                reverse=True
            )
            
            # Take most recent for each key
            seen_keys = set()
            for entry in entries:
                key = entry.get("metadata", {}).get("state_key")
                if key and key not in seen_keys:
                    try:
                        state[key] = json.loads(entry["document"])["value"]
                    except (json.JSONDecodeError, KeyError):
                        state[key] = entry["document"]
                    seen_keys.add(key)
        
        return state
    
    def get_session_summary(self) -> dict[str, Any]:
        """Get a summary of the current session."""
        return {
            "session_id": self.session_id,
            "created_at": self.created_at,
            "mode": self.mode,
            "collections": {
                key: coll.count() for key, coll in self.collections.items()
            },
            "current_state": self.get_current_state(),
        }
    
    def clear_session(self):
        """Clear all session data."""
        for key, coll in self.collections.items():
            try:
                self.client.delete_collection(coll.name)
            except Exception:
                pass
        
        self.collections = self._init_collections()
        print(f"🗑️ Session {self.session_id} cleared")


# FastAPI server for MCP integration
def create_app(memory: SessionMemory):
    """Create FastAPI app for session memory HTTP API."""
    try:
        from fastapi import FastAPI, HTTPException
        from fastapi.responses import JSONResponse
        from pydantic import BaseModel
    except ImportError:
        print("❌ fastapi not installed. Run: pip install fastapi uvicorn")
        sys.exit(1)
    
    app = FastAPI(title="Session Memory API")
    
    class InteractionRequest(BaseModel):
        interaction_type: str
        content: str
        metadata: dict | None = None
    
    class StateChangeRequest(BaseModel):
        state_key: str
        state_value: Any
        previous_value: Any | None = None
    
    class ToolOutputRequest(BaseModel):
        tool_name: str
        inputs: dict
        output: Any
        success: bool = True
    
    class SearchRequest(BaseModel):
        query: str
        collection: str = "interactions"
        n_results: int = 5
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "session_id": memory.session_id}
    
    @app.get("/summary")
    async def summary():
        return memory.get_session_summary()
    
    @app.post("/interaction")
    async def store_interaction(req: InteractionRequest):
        doc_id = memory.store_interaction(
            req.interaction_type,
            req.content,
            req.metadata,
        )
        return {"status": "success", "id": doc_id}
    
    @app.post("/state")
    async def store_state(req: StateChangeRequest):
        doc_id = memory.store_state_change(
            req.state_key,
            req.state_value,
            req.previous_value,
        )
        return {"status": "success", "id": doc_id}
    
    @app.post("/tool")
    async def store_tool(req: ToolOutputRequest):
        doc_id = memory.store_tool_output(
            req.tool_name,
            req.inputs,
            req.output,
            req.success,
        )
        return {"status": "success", "id": doc_id}
    
    @app.post("/search")
    async def search(req: SearchRequest):
        results = memory.search_context(
            req.query,
            req.collection,
            req.n_results,
        )
        return {"results": results}
    
    @app.get("/recent")
    async def recent(limit: int = 10):
        return {"interactions": memory.get_recent_interactions(limit)}
    
    @app.get("/state")
    async def get_state():
        return {"state": memory.get_current_state()}
    
    @app.delete("/clear")
    async def clear():
        memory.clear_session()
        return {"status": "cleared"}
    
    return app


def main():
    parser = argparse.ArgumentParser(description="Session Memory Manager")
    
    parser.add_argument(
        "--mode",
        choices=["http", "persistent", "ephemeral"],
        default="persistent",
        help="ChromaDB mode"
    )
    parser.add_argument("--host", default="localhost", help="ChromaDB host (http mode)")
    parser.add_argument("--port", type=int, default=8001, help="ChromaDB port (http mode)")
    parser.add_argument("--persist-dir", default=DEFAULT_PERSIST_DIR, help="Persistence directory")
    parser.add_argument("--session-id", help="Session identifier")
    
    # Server mode
    parser.add_argument("--serve", action="store_true", help="Run as HTTP server")
    parser.add_argument("--serve-port", type=int, default=8002, help="HTTP server port")
    
    args = parser.parse_args()
    
    # Create memory instance
    memory = SessionMemory(
        mode=args.mode,
        host=args.host,
        port=args.port,
        persist_dir=args.persist_dir,
        session_id=args.session_id,
    )
    
    if args.serve:
        # Run as HTTP server
        try:
            import uvicorn
        except ImportError:
            print("❌ uvicorn not installed. Run: pip install uvicorn")
            sys.exit(1)
        
        app = create_app(memory)
        print(f"🚀 Starting Session Memory server on port {args.serve_port}")
        uvicorn.run(app, host="0.0.0.0", port=args.serve_port)
    else:
        # Interactive mode - print summary
        print("\n📊 Session Summary:")
        print(json.dumps(memory.get_session_summary(), indent=2))


if __name__ == "__main__":
    main()
