# ModMe GenUI Agent

**Python ADK Agent for Generative UI Workbench**

This agent provides the backend orchestration for the ModMe GenUI Workbench, combining Google's Agent Development Kit (ADK) with semantic routing for intelligent multi-agent coordination.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│            (React 19 + CopilotKit + Canvas)             │
└───────────────────────┬─────────────────────────────────┘
                        │ State Bridge (useCoAgent)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Python ADK Agent                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Semantic Router Layer                  │  │
│  │  (Intent Classification → Agent Selection)       │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Agent Registry                       │  │
│  │  • Dashboard Agent    • Data Query Agent         │  │
│  │  • Visualization Agent • Component Agent         │  │
│  │  • Analysis Agent     • Audit Agent              │  │
│  │  • Multimodal Agent   • Chitchat Agent           │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Tool Execution Layer                 │  │
│  │  (upsert_ui_element, remove_ui_element, etc.)    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. ADK Agent (`main.py`)

- **Framework**: Google Agent Development Kit
- **Model**: Gemini 2.5 Flash
- **State Management**: Callback context with shared state
- **Tools**: UI manipulation functions (upsert, remove, clear)

#### 2. Semantic Router (`routes/`)

- **Purpose**: Intent classification for multi-agent orchestration
- **Modes**:
  - `local` (default): HuggingFace sentence-transformers, privacy-first
  - `cloud`: OpenAI embeddings, higher accuracy
- **Routes**: 8 specialized agent types (dashboard, data_query, visualization, etc.)
- **Features**: Single routing, ensemble (top-k), continuous learning

#### 3. Agent Functions (`tools/` - Phase 2)

Specialized agents for different capabilities:

- Dashboard generation
- Data queries and SQL
- Visualization creation
- Component selection
- Analytics and insights
- Audit logging
- Multimodal processing
- Conversational fallback

---

## Project Structure

```
agent/
├── main.py                  # ADK agent entry point
├── pyproject.toml           # Dependencies and configuration
├── uv.lock                  # Locked dependencies (uv)
├── routes/                  # Semantic routing (Phase 1)
│   ├── __init__.py          # Package initialization
│   ├── definitions.py       # Route definitions with utterances
│   ├── router.py            # ModMeSemanticRouter class
│   └── README.md            # Routing documentation
├── tools/                   # Agent functions (Phase 2 - TBD)
│   ├── agent_map.py         # Route → Agent mapping
│   ├── dashboard_agent.py   # Dashboard generation
│   ├── data_query_agent.py  # Data fetching/SQL
│   └── ...                  # Other specialized agents
└── tests/                   # Test suite
    ├── __init__.py
    └── test_semantic_router.py
```

---

## Development Workflow

### Setup

1. **Install Dependencies**

Using `uv` (recommended):

```bash
cd agent
uv sync

# For fully local operation (includes sentence-transformers)
uv sync --extra local

# For development with testing
uv sync --extra test
```

Using `pip`:

```bash
cd agent
pip install -e .

# Optional extras
pip install -e ".[local]"
pip install -e ".[test]"
```

1. **Environment Configuration**

Copy `.env.example` to `.env` and configure:

```bash
# Required: Google API key for Gemini
GOOGLE_API_KEY=your_google_api_key_here

# Semantic Router (optional)
SEMANTIC_ROUTER_MODE=local  # or "cloud"
SEMANTIC_ROUTE_THRESHOLD=0.5
```

1. **Run the Agent**

```bash
# From repository root
npm run dev:agent

# Or directly
cd agent
python main.py
```

Agent will start on `http://localhost:8000`

### Testing

```bash
cd agent

# Run all tests
pytest

# Run specific test file
pytest tests/test_semantic_router.py -v

# With coverage
pytest --cov=routes --cov-report=term-missing

# Specific test
pytest tests/test_semantic_router.py::TestDashboardRouting -v
```

---

## State Management

### Shared State Structure

The agent maintains shared state synchronized with the frontend:

```python
{
    "elements": [
        {
            "id": "stat_card_1",
            "type": "StatCard",
            "props": {
                "title": "Revenue",
                "value": "$1.2M",
                "trend": "+12%"
            }
        }
    ],
    "routing": {  # Phase 2
        "lastRoute": "dashboard",
        "confidence": 0.95,
        "timestamp": "2024-01-01T12:00:00Z"
    }
}
```

### State Access

```python
def my_tool(tool_context: ToolContext, arg: str) -> dict:
    # Read state
    elements = tool_context.state.get("elements", [])

    # Modify state
    tool_context.state["elements"].append(new_element)

    return {"status": "success"}
```

---

## Tool Development

### Creating a New Tool

Tools are functions registered with the ADK agent:

```python
def my_new_tool(tool_context: ToolContext, param1: str, param2: int) -> Dict[str, Any]:
    """
    Tool description for the LLM.

    Args:
        param1: Description of parameter 1
        param2: Description of parameter 2

    Returns:
        Dictionary with operation results
    """
    # Access state
    state = tool_context.state

    # Tool logic here
    result = do_something(param1, param2)

    # Update state if needed
    state["key"] = result

    return {"status": "success", "result": result}

# Register with agent
agent = LlmAgent(
    tools=[my_new_tool, existing_tool, ...]
)
```

### Tool Guidelines

1. **Type Hints**: Always use type hints for parameters and return values
2. **Docstrings**: Clear descriptions for LLM understanding
3. **State Updates**: Modify `tool_context.state` for UI synchronization
4. **Error Handling**: Return error status, don't raise exceptions
5. **Validation**: Validate inputs before execution

---

## Semantic Routing Integration

### Current Status (Phase 1)

✅ Core infrastructure implemented:

- 8 route definitions with diverse utterances
- Local and cloud mode support
- Singleton router pattern
- Comprehensive test coverage

### Usage (Phase 1)

```python
from routes.router import get_router

router = get_router()

# Simple routing
route = router.route("show me a dashboard")
print(route.name)  # "dashboard"

# Ensemble routing
top_routes = router.top_k_routes("analyze data and create chart", k=3)
for route, score in top_routes:
    print(f"{route.name}: {score:.2f}")
```

### Future Integration (Phase 2)

The semantic router will be integrated into the main agent:

```python
# Planned integration
def handle_query(tool_context: ToolContext, query: str) -> dict:
    """Route query to appropriate agent and execute."""
    from routes.router import get_router
    from tools.agent_map import AGENT_MAP

    router = get_router()
    route = router.route(query)

    if route and route.name in AGENT_MAP:
        agent_func = AGENT_MAP[route.name]
        return agent_func(tool_context, query)

    return {"error": "No matching agent"}
```

See `SEMANTIC_ROUTER_TODO.md` for full integration roadmap.

---

## Debugging

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug

# Or set when running
LOG_LEVEL=debug python main.py
```

### Common Issues

1. **Import Errors**
   - Ensure dependencies installed: `uv sync` or `pip install -e .`
   - Check Python version: `python --version` (need 3.12+)

2. **Google API Key Issues**
   - Verify key in `.env`: `GOOGLE_API_KEY=...`
   - Test key validity: Check Google AI Studio

3. **State Not Syncing**
   - Check frontend state bridge configuration
   - Verify agent is running on port 8000
   - Check network requests in browser DevTools

4. **Semantic Router Not Working**
   - Install local extras: `uv sync --extra local`
   - Check SEMANTIC_ROUTER_MODE in `.env`
   - For cloud mode, verify OPENAI_API_KEY

---

## Performance Considerations

### Current Performance

- **Agent Response Time**: 500ms - 2s (depends on model)
- **State Sync**: <100ms
- **Tool Execution**: 10-500ms (depends on tool)

### Optimization Tips

1. **Model Selection**: Use `gemini-2.5-flash` for speed, `gemini-pro` for quality
2. **State Management**: Keep state minimal, avoid large objects
3. **Caching**: Cache repeated computations in tools
4. **Async Operations**: Use async tools for I/O operations (Phase 2+)

---

## Security & Privacy

### Privacy-First Design

1. **Local-Only Mode**: Default configuration runs everything locally
2. **No External Calls**: Semantic router uses local embeddings by default
3. **Data Isolation**: Client data in `../data/` never leaves localhost
4. **API Keys**: Stored in `.env` (git-ignored)

### Best Practices

1. **Input Validation**: Validate all user inputs in tools
2. **Sanitization**: Sanitize data before UI rendering
3. **Audit Logging**: Log sensitive operations (Phase 2)
4. **Rate Limiting**: Implement rate limits for production (Phase 2+)

---

## Deployment

### Development

```bash
# Run both UI and agent
npm run dev

# Run agent only
npm run dev:agent
```

### Production (Future)

The agent can be deployed separately:

```bash
# Build
cd agent
uv build

# Run with production settings
GOOGLE_API_KEY=... uvicorn main:app --host 0.0.0.0 --port 8000
```

For containerized deployment, see `.devcontainer/devcontainer.json` for reference.

---

## Contributing

### Adding New Features

1. **Routes**: Add to `routes/definitions.py`, update tests
2. **Tools**: Create function in `main.py` or new file in `tools/`
3. **Agents**: Create in `tools/` (Phase 2+), map in `agent_map.py`
4. **Tests**: Add to `tests/`, ensure coverage >80%

### Code Standards

- **Type Hints**: Required for all functions
- **Docstrings**: Google style docstrings
- **Testing**: Unit tests for all new functionality
- **Documentation**: Update README for significant changes

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Run test suite: `pytest`
4. Update documentation
5. Submit PR with description

---

## Related Documentation

- [Semantic Router README](routes/README.md) - Detailed routing documentation
- [Integration Roadmap](../SEMANTIC_ROUTER_TODO.md) - Future development plans
- [Project Overview](../Project_Overview.md) - High-level architecture
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines

---

## Troubleshooting Guide

### Agent Won't Start

1. Check Python version: `python --version` (need 3.12+)
2. Install dependencies: `uv sync`
3. Verify Google API key in `.env`
4. Check port 8000 is available: `lsof -i :8000`

### Tests Failing

1. Install test dependencies: `uv sync --extra test`
2. Check test data setup
3. Verify semantic-router installed: `pip list | grep semantic-router`

### Slow Performance

1. Use flash model: `AGENT_MODEL=gemini-2.5-flash`
2. Enable caching (future)
3. Profile with Python profiler
4. Check network latency to Google APIs

---

## Version History

- **v0.2.0** - Added semantic routing infrastructure (Phase 1)
- **v0.1.0** - Initial ADK agent with basic tools

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Issues**: Create GitHub issue with "agent" label
- **Questions**: See CONTRIBUTING.md
- **Documentation**: Check routes/README.md and inline docstrings
