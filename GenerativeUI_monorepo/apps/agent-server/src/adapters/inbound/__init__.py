"""Inbound adapters (driving side)."""

from .websocket_route import create_websocket_router

__all__ = ["create_websocket_router"]
