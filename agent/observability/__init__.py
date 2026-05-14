"""GreptimeDB Observability Package"""

from .greptime_config import (
    GreptimeDBConfig,
    initialize_observability,
    instrument_fastapi,
    setup_metrics,
    setup_tracing,
)

# Phoenix + OpenInference
try:
    from .phoenix_config import (
        PhoenixConfig,
        get_phoenix_ui_url,
        initialize_phoenix,
        setup_phoenix_tracing,
    )
    from .phoenix_instrumentors import (
        AnthropicInstrumentor,
        GoogleGenerativeAIInstrumentor,
        OpenAIInstrumentor,
        add_llm_span_attributes,
        instrument_all_providers,
        uninstrument_all_providers,
    )

    PHOENIX_AVAILABLE = True
except ImportError:
    PHOENIX_AVAILABLE = False

__all__ = [
    "GreptimeDBConfig",
    "setup_metrics",
    "setup_tracing",
    "instrument_fastapi",
    "initialize_observability",
]

if PHOENIX_AVAILABLE:
    __all__.extend([
        "PhoenixConfig",
        "initialize_phoenix",
        "setup_phoenix_tracing",
        "get_phoenix_ui_url",
        "instrument_all_providers",
        "uninstrument_all_providers",
        "add_llm_span_attributes",
        "AnthropicInstrumentor",
        "OpenAIInstrumentor",
        "GoogleGenerativeAIInstrumentor",
    ])
