"""GreptimeDB Observability Package"""

from .greptime_config import (
    GreptimeDBConfig,
    initialize_observability,
    instrument_fastapi,
    setup_metrics,
    setup_tracing,
)

__all__ = [
    "GreptimeDBConfig",
    "setup_metrics",
    "setup_tracing",
    "instrument_fastapi",
    "initialize_observability",
]
