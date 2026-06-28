"""Application layer — composition root and DI wiring."""

from .container import AppContainer, create_container
from .factory import create_app

__all__ = ["AppContainer", "create_app", "create_container"]
