"""Semantic routing for multi-agent orchestration in ModMe GenUI Workbench."""

from .definitions import ALL_ROUTES
from .router import ModMeSemanticRouter, get_router

__all__ = ["ALL_ROUTES", "ModMeSemanticRouter", "get_router"]
