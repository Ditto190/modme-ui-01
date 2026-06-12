"""
FastAPI application entry point for the agent server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from .routes import websocket_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Agent Server",
    description="FastAPI + AG2 (AutoGen) backend for Generative UI",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(websocket_router)


@app.get("/")
async def root() -> dict:
    """Root endpoint"""
    return {
        "message": "Agent Server API",
        "version": "0.1.0",
        "endpoints": {
            "websocket": "/ws/agent",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health() -> dict:
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
