# Semantic Router - Multi-Agent Orchestration

## Overview

The semantic router provides intelligent intent classification for the ModMe GenUI Workbench. It analyzes user queries and routes them to the appropriate specialized agent, enabling sophisticated multi-agent orchestration.

## Architecture

```
User Query
    ↓
Semantic Router (Local Embeddings)
    ↓
Intent Classification
    ↓
Route Selection (8 specialized routes)
    ↓
Agent Execution (Phase 2)
```

### Privacy-First Design

By default, the router operates in **local mode**:
- Uses HuggingFace sentence-transformers locally
- No external API calls for embeddings
- Vectors stored in-memory only
- Client data never leaves localhost

## Route Definitions

### 1. Dashboard Route (`dashboard`)
**Purpose**: Handle requests to create or modify dashboard interfaces

**Examples**:
- "show me a dashboard"
- "create a KPI view"
- "build a reporting interface"

**Target Agent**: Dashboard generation agent (Phase 2)

### 2. Data Query Route (`data_query`)
**Purpose**: Process database queries and data retrieval requests

**Examples**:
- "query the database"
- "fetch data from customers table"
- "get all records where status is active"

**Target Agent**: SQL/data fetching agent (Phase 2)

### 3. Visualization Route (`visualization`)
**Purpose**: Create charts, graphs, and visual representations

**Examples**:
- "create a bar chart"
- "plot sales over time"
- "show me a line graph"

**Target Agent**: Chart generation agent (Phase 2)

### 4. Component Route (`component`)
**Purpose**: Select and configure UI components

**Examples**:
- "add a stat card"
- "insert a data table component"
- "show me available components"

**Target Agent**: Component registry agent (Phase 2)

### 5. Analysis Route (`analysis`)
**Purpose**: Perform analytical operations (trends, correlations, statistics)

**Examples**:
- "analyze sales trends"
- "find correlations in the data"
- "identify outliers"

**Target Agent**: Analytics agent (Phase 2)

### 6. Audit Route (`audit`)
**Purpose**: Handle compliance logging and audit trail requests

**Examples**:
- "log this action"
- "show me the audit log"
- "compliance report for last month"

**Target Agent**: Audit logging agent (Phase 2)

### 7. Multimodal Route (`multimodal`)
**Purpose**: Process images, documents, and other non-text inputs

**Examples**:
- "analyze this image"
- "extract text from document"
- "what's in this picture"

**Target Agent**: Multimodal processing agent (Phase 2)

### 8. Chitchat Route (`chitchat`)
**Purpose**: Handle conversational queries and small talk

**Examples**:
- "hello"
- "what can you do"
- "thanks"

**Target Agent**: Conversational fallback agent (Phase 2)

## Usage

### Basic Routing

```python
from routes.router import get_router

# Get singleton router instance
router = get_router()

# Route a single query
route = router.route("show me a dashboard")
print(f"Selected route: {route.name}")  # Output: dashboard

# Route with confidence score
route, score = router.route_with_score("create a bar chart")
print(f"Route: {route.name}, Score: {score}")
```

### Ensemble Routing

For queries that may span multiple agent capabilities:

```python
# Get top 3 routes with confidence scores
top_routes = router.top_k_routes(
    "analyze data and create a chart",
    k=3,
    threshold=0.5
)

for route, score in top_routes:
    print(f"{route.name}: {score:.2f}")
# Output might be:
# analysis: 0.85
# visualization: 0.78
# data_query: 0.62
```

### Continuous Learning

Add new utterances dynamically based on user interactions:

```python
# Add a new example utterance
router.add_utterance(
    route_name="dashboard",
    utterance="I need a business intelligence view"
)
```

## Configuration

### Environment Variables

Set in `.env` file:

```bash
# Routing mode: "local" (default) or "cloud"
SEMANTIC_ROUTER_MODE=local

# Cloud mode only - OpenAI API key
# OPENAI_API_KEY=sk-...

# Routing thresholds
SEMANTIC_ROUTE_THRESHOLD=0.5
ENSEMBLE_TOP_K=3

# Feature flags
ENABLE_SEMANTIC_ROUTING=true
ENABLE_ROUTE_LOGGING=true
ENABLE_ENSEMBLE_MODE=true
```

### Local Mode (Default)

```python
from routes.router import ModMeSemanticRouter

# Explicit local mode
router = ModMeSemanticRouter(mode="local")
```

**Advantages**:
- No external API calls
- Complete privacy
- No API key required
- Faster for small-scale usage

**Model**: `sentence-transformers/all-MiniLM-L6-v2`

### Cloud Mode

```python
import os
os.environ["OPENAI_API_KEY"] = "sk-..."

router = ModMeSemanticRouter(mode="cloud")
```

**Advantages**:
- Higher accuracy for complex queries
- Better handling of domain-specific terminology

**Requirements**:
- OpenAI API key
- Internet connection

## Extending Routes

### Adding a New Route

1. **Define the route** in `definitions.py`:

```python
from semantic_router import Route

custom_route = Route(
    name="custom_agent",
    utterances=[
        "example utterance 1",
        "example utterance 2",
        "example utterance 3",
        # Add 5-10 diverse examples
    ],
)

# Add to ALL_ROUTES
ALL_ROUTES.append(custom_route)
```

2. **Add diverse utterances**:
   - Different phrasings of the same intent
   - Formal and casual language
   - Questions, imperatives, declaratives
   - Domain-specific terminology

3. **Test the new route**:

```python
from routes.router import get_router

router = get_router()
result = router.route("your test query")
assert result.name == "custom_agent"
```

### Utterance Guidelines

Each route should have **5-10 diverse utterances** covering:

1. **Semantic Variety**: Different ways to express the same intent
2. **Formality Levels**: "show dashboard" vs "I need analytics"
3. **Question Types**: Interrogative, imperative, declarative
4. **Domain Terms**: Technical vs. business language
5. **Length Variety**: Short phrases and longer sentences

**Good Example** (data_query route):
```python
utterances=[
    "query the database",              # Simple imperative
    "get all records where status is active",  # Detailed SQL-like
    "show me users who signed up last month",  # Natural question
    "pull data for Q4 analysis",      # Business context
]
```

**Poor Example** (too similar):
```python
utterances=[
    "query database",
    "query the database",
    "database query",
    "query db",
]
```

## Performance Guidelines

### Expected Latency

- **Local Mode**: 10-50ms per query
- **Cloud Mode**: 100-300ms per query (depends on API latency)
- **Top-K Routing**: 50-200ms (local), 300-800ms (cloud)

### Threshold Tuning

The similarity threshold determines routing sensitivity:

- **0.3-0.4**: Very permissive, may route unrelated queries
- **0.5**: Balanced (default)
- **0.6-0.7**: More strict, requires closer matches
- **0.8+**: Very strict, may miss valid queries

Tune based on your use case:

```python
# More permissive for exploratory interfaces
top_routes = router.top_k_routes(query, k=3, threshold=0.4)

# More strict for production systems
top_routes = router.top_k_routes(query, k=3, threshold=0.7)
```

### Optimization Tips

1. **Cache embeddings**: The router automatically caches utterance embeddings
2. **Use local mode**: Significantly faster for most use cases
3. **Limit top-k**: Keep k ≤ 5 for responsive UIs
4. **Pre-warm**: Initialize router at startup, not on first request

## Testing

Run the test suite:

```bash
cd agent
pytest tests/test_semantic_router.py -v
```

Run with coverage:

```bash
pytest tests/test_semantic_router.py --cov=routes --cov-report=term-missing
```

## Integration Roadmap

- **Phase 1** (Current): Core routing infrastructure ✅
- **Phase 2**: Agent function mapping and execution
- **Phase 3**: Frontend state bridge and visualization
- **Phase 4**: Continuous learning and monitoring

See `SEMANTIC_ROUTER_TODO.md` for detailed integration plan.

## Troubleshooting

### Import Errors

```bash
# Install dependencies
cd agent
pip install semantic-router

# For local mode
pip install semantic-router[local]
```

### Slow First Query

The first query initializes the encoder and computes embeddings. Subsequent queries are much faster.

**Solution**: Pre-warm the router at startup:

```python
from routes.router import get_router

# Initialize at startup
router = get_router()
router.route("warmup query")  # Prime the cache
```

### Low Confidence Scores

If routes consistently return low scores:

1. **Add more diverse utterances** to route definitions
2. **Lower the threshold** (0.4-0.5 instead of 0.6+)
3. **Check for typos** in query or utterances
4. **Consider cloud mode** for better semantic understanding

### Cloud Mode Not Working

```python
# Check API key is set
import os
print(os.getenv("OPENAI_API_KEY"))

# Verify internet connection
# Verify OpenAI API status
```

## References

- [Semantic Router GitHub](https://github.com/aurelio-labs/semantic-router)
- [Semantic Router Documentation](https://docs.aurelio.ai/semantic-router/)
- [HuggingFace Sentence Transformers](https://huggingface.co/sentence-transformers)
- [ModMe Project Overview](../README.md)
