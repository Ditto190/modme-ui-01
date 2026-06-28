"""
FastAPI application entry point for the agent server
"""
from .app.factory import create_app

app = create_app()


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
