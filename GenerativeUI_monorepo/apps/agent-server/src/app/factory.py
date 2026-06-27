"""FastAPI application factory."""

import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..adapters.inbound.websocket_route import create_websocket_router
from ..routes.inbox_pipeline import inbox_pipeline_router
from .container import AppContainer, create_container

load_dotenv()


def create_app(container: Optional[AppContainer] = None) -> FastAPI:
    """Create and wire the FastAPI application."""
    deps = container or create_container()

    app = FastAPI(
        title="Agent Server",
        description="FastAPI + AG2 (AutoGen) backend for Generative UI",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(
        create_websocket_router(deps.orchestrator, deps.connection_manager)
    )
    app.include_router(inbox_pipeline_router)

    @app.get("/")
    async def root() -> dict:
        return {
            "message": "Agent Server API",
            "version": "0.1.0",
            "endpoints": {
                "websocket": "/ws/agent",
                "inbox_pipeline": "/api/inbox/health",
                "docs": "/docs",
            },
        }

    @app.get("/health")
    async def health() -> dict:
        return {"status": "healthy"}

    return app
