# Copilot Instructions - Consulting Data Science Multi-Agent Workspace

## Project Philosophy

This is a **local-first, privacy-focused consulting data science platform** designed for client work requiring strict compliance and auditability. Built for consulting workflows with reproducibility, security, and offline capability as core principles.

### Core Design Principles

1. **Local-First by Default**: No cloud dependencies, remote Git, or external API requirements (unless explicitly configured)
2. **Auditability**: All operations logged to SQLite (`artifacts.db`) for compliance and review
3. **Reproducibility**: Pinned dependencies, isolated venv, automated VSCode tasks for consistent environments
4. **Privacy & Security**: Sensitive client data never leaves local machine; MicroSandbox isolation for code execution
5. **Consulting-Ready**: 333 expert agents curated for business analysis, data science, and strategic consulting

## Project Architecture

This is a **multi-agent data analysis platform** combining AG2 (AutoGen), MicroSandbox, FastAgency, and CopilotKit. The workspace enables:

- Multi-agent Jupyter notebook workflows with persistent memory (SQLite + ChromaDB)
- Safe code execution in MicroSandbox microVMs (**preferable to Docker for security and speed**)
- Web-based multi-agent dashboards (FastAgency + Mesop UI)
- Agent library of 333+ specialized experts (`src/Agents/agent_library_master.json`)
  - **Recent**: Converted 118 Copilot agents + 118 AG2 agents (18 data science focused)
- Automated data pipelines (optional CrewAI workflows)

### Component Boundaries

```
consulting_projects_tests/
│
├── data/                        # Client data (NEVER commit to Git)
│   ├── raw/                    # Original datasets (PDF, DOCX, XLSX, CSV)
│   ├── processed/              # Cleaned data (JSON, CSV, Parquet)
│   └── reports/                # Generated analysis reports
│
├── notebooks/                   # Interactive multi-agent analysis
│   ├── 01_data_exploration.ipynb    # Exploratory data analysis
│   ├── 02_agent_conversations.ipynb # Team collaboration patterns
│   ├── *_ag2_*.ipynb           # AG2 feature demos (autobuild, web search)
│   └── memory/                 # Persistent conversation storage
│       ├── conversations.db    # SQLite conversation history
│       └── chromadb/          # Vector embeddings for semantic search
│
├── src/
│   ├── ai/                     # Core AI capabilities (AG2 wrappers)
│   │   ├── ag2_autobuild.py   # Auto-generate multi-agent systems from NL
│   │   ├── ag2_web_search.py  # Web search tool integration
│   │   ├── agentic_fleet_integration.py  # Multi-agent orchestration
│   │   ├── rag_store.py       # Local vector store (ChromaDB)
│   │   └── chunking.py        # Document chunking strategies
│   │
│   ├── Agents/                 # Agent implementations
│   │   ├── captain_agent_*.py # Progressive examples: basic → library → tools
│   │   ├── microsandbox_*.py  # Sandbox lifecycle & MCP integration
│   │   └── agent_library_master.json  # 333 expert agent definitions
│   │
│   ├── FastAgency/            # Mesop web UI & workflows
│   │   ├── workflow.py        # Define @wf.register workflows here
│   │   └── local/main_mesop.py # Web server entry point
│   │
│   ├── CopilotKit/            # Next.js dashboard (multi-page)
│   │   ├── agent-py/          # FastAPI backends per workflow
│   │   │   ├── agent_team_workflow.py  # 333-agent chat backend
│   │   │   ├── exploration_workflow.py # Data analysis backend
│   │   │   └── pipeline_workflow.py    # Pipeline control backend
│   │   └── ui/app/            # Next.js pages
│   │       ├── chat/          # Agent chat interface
│   │       ├── analysis/      # Data exploration UI
│   │       ├── pipelines/     # Pipeline management
│   │       ├── memory/        # Conversation history viewer
│   │       └── reports/       # Generated reports gallery
│   │
│   ├── pipelines/             # Automated data workflows (optional CrewAI)
│   │   ├── ingest_docs.py    # Document ingestion (PDF, DOCX, XLSX)
│   │   ├── tests_to_notebooks.py  # Test → Notebook conversion
│   │   └── export_reports.py # Markdown → PDF/DOCX export
│   │
│   └── utils/                 # Configuration & logging
│       ├── config.py          # Environment variable loading
│       └── audit.py           # SQLite audit logging
│
├── .vscode/
│   ├── tasks.json             # VSCode automation (create_venv, install_deps, test)
│   └── settings.json          # Python venv discovery, format-on-save
│
├── artifacts.db               # SQLite audit log (ALL operations logged here)
├── requirements.txt           # Pinned dependencies for reproducibility
└── .env.example               # Template (NEVER commit actual .env)
```

**Critical Patterns**:

- AG2 agents run in **MicroSandbox microVMs** (not Docker) for isolation
- All client data stays in `data/` (`.gitignore` prevents commits)
- Audit trail in `artifacts.db` tracks every ingestion, pipeline run, and metric
- Memory persistence enables agents to reference past conversations

## Essential Workflows

### Data Analysis Workflow (Jupyter Notebooks)

**Primary workflow for consulting analysis:**

```python
# In notebooks/01_data_exploration.ipynb
from autogen import ConversableAgent, GroupChat, GroupChatManager

# Load agents from 333-agent library
data_analyst = load_agent_from_library("Data_Analyst")
statistician = load_agent_from_library("Statistician")

# Create group chat for collaborative analysis
groupchat = GroupChat(agents=[data_analyst, statistician], ...)
manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

# Analyze client data
user_proxy.initiate_chat(
    manager,
    message="Analyze Q4 sales trends and identify key insights..."
)

# Conversations automatically saved to notebooks/memory/conversations.db
# Vector embeddings saved to notebooks/memory/chromadb/ for semantic search
```

### Running Multi-Agent Workflows

**FastAgency Web UI** (recommended for client demos):

```powershell
# Press Ctrl+Shift+B (default build task) OR:
waitress-serve --listen=0.0.0.0:8000 src.FastAgency.local.main_mesop:app
# Open http://localhost:8000
```

**MicroSandbox Lifecycle** (for safe agent code execution):

- `Ctrl+Shift+B` = Auto-start server → run python-dev → auto-stop
- Server auto-starts from Python: `src/Agents/demo_auto_lifecycle.py` demonstrates pattern
- All VSCode tasks documented in `VSCODE_TASKS_QUICKSTART.md`
- Sandbox persistence in `./menv/` directory preserves state across restarts

**AG2 AutoBuild** (generate agents from natural language):

```powershell
python src/launch_ag2_autobuild.py run "Create agents to analyze customer churn data"
```

### Document Ingestion Pipeline

**Process client documents** (PDFs, DOCX, XLSX, CSV):

```powershell
# Via VSCode task
Ctrl+Shift+P → Tasks: Run Task → "ingest_docs"

# Or manually
python src/pipelines/ingest_docs.py

# Results:
# - Extracted text/tables → data/processed/*.json, *.csv
# - Audit log entry → artifacts.db
# - Ready for agent analysis
```

**Pipeline flow**:

```
data/raw/*.{pdf,docx,xlsx,csv}
    ↓ Extract text & tables
    ↓ Chunk semantically (chunking.py)
    ↓ Store in data/processed/
    ↓ Log to artifacts.db
    ↓ Index in ChromaDB (optional)
```

### Configuration Pattern

**CRITICAL for consulting work**: Never hardcode API keys or client data paths.

```python
from dotenv import load_dotenv
import os

load_dotenv()  # Load from .env file (never committed to Git)

# Gemini is FREE TIER default (no client billing)
llm_config = LLMConfig(
    model="gemini-2.5-flash-preview-09-2025",
    api_key=os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
    api_type="google",
    temperature=0.8
)

# Client data paths from config
raw_data_path = os.getenv("RAW_DATA_PATH", "data/raw")
processed_data_path = os.getenv("PROCESSED_DATA_PATH", "data/processed")
```

**Configuration files**:

- `configs/oai_config_list.json` - Supports OpenAI & Gemini models
- `.env.example` - Template (copy to `.env` and add keys)
- `src/utils/config.py` - Centralized config management
- AG2 AutoBuild & FastAgency default to Gemini (free tier, no client cost)

**Local-only AI** (for maximum privacy):

```python
# Use local embeddings (no API calls)
USE_LOCAL_EMBEDDINGS=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Use ChromaDB locally (no cloud vector DB)
USE_CHROMADB_LOCAL=true
```

## Code Patterns & Conventions

### AG2 Agent Creation Pattern

**Progressive complexity** (see `src/Agents/captain_agent_*.py`):

1. `captain_agent_01_basic.py` - Simple 2-agent conversation
2. `captain_agent_02_with_agent_library.py` - Load from 333-agent JSON library
3. `captain_agent_03_with_tools.py` - Add web search & custom functions

```python
from autogen import AssistantAgent, UserProxyAgent, register_function

# Standard pattern: AssistantAgent + UserProxyAgent
assistant = AssistantAgent(
    name="TaskPlanner",
    system_message="You are a strategic task planner...",
    llm_config=llm_config
)

user_proxy = UserProxyAgent(
    name="Executor",
    code_execution_config=False,  # Use MicroSandbox instead
    human_input_mode="NEVER"
)

# Tool registration (AG2 style)
register_function(
    my_custom_tool,
    caller=assistant,
    executor=user_proxy,
    name="tool_name",
    description="Clear description for LLM"
)
```

### Agent Library Usage

Load expert agents from `agent_library_master.json` (333 specialists):

```python
import json
from pathlib import Path

# Load master library (333 agents including 18 data science focused)
library_path = Path("src/Agents/agent_library_master.json")
with open(library_path) as f:
    library = json.load(f)

# Find specialist by exact name match
data_analyst = next(a for a in library if a["name"] == "Data_Analyst")
agent = AssistantAgent(
    name=data_analyst["name"],
    system_message=data_analyst["system_message"],
    llm_config=llm_config
)

# Or search by description (fuzzy matching)
consultants = [a for a in library if "consult" in a["description"].lower()]
```

**Agent library history**:

- Originally 333 expert agents
- Recently converted 118 Copilot agents → AG2 format
- Added 118 AG2-native agents (18 specialized for data science)
- All stored in `agent_library_master.json` with structured metadata

**Naming convention**: Use underscores (e.g., `Data_Analyst`, not `Data Analyst`)

### FastAgency Workflow Pattern

New workflows go in `src/FastAgency/workflow.py`:

```python
@wf.register(name="my_workflow", description="Brief description for UI")
def my_workflow(ui: UI, params: dict[str, Any]) -> str:
    """Workflow docstring"""
    user_input = ui.text_input(
        sender="Workflow",
        recipient="User",
        prompt="What would you like to analyze?"
    )

    with llm_config:  # Context manager for config
        agent1 = ConversableAgent(name="Agent1", ...)
        agent2 = ConversableAgent(name="Agent2", ...)

    response = agent1.run(agent2, message=user_input, max_turns=3)
    return ui.process(response)
```

### MicroSandbox Integration

**Two approaches** for safe code execution (NEVER use Docker):

1. **Auto-lifecycle** (recommended for production agents):

```python
from src.Agents.microsandbox_lifecycle import MicroSandboxLifecycleManager

async with MicroSandboxLifecycleManager() as lifecycle:
    result = await lifecycle.execute_in_sandbox(
        code="print('Hello from isolated environment')",
        language="python"
    )
    # Code runs in isolated microVM
    # State persists in ./menv/ directory
    # Automatically cleaned up on exit
```

2. **Manual control** (development/debugging):

```bash
# Via WSL tasks (defined in .vscode/tasks.json)
wsl bash -c "msb server start --dev"
wsl bash -c "msr python-dev"
wsl bash -c "msb server stop"
```

**Persistence**: MicroSandbox saves to `./menv/` directory:

```
consulting_projects_tests/
├── menv/                    # Sandbox persistence
│   └── app/                 # Per-sandbox folders
│       ├── filesystem/      # File changes
│       ├── packages/        # pip installs
│       └── state/           # Runtime state
```

**Why MicroSandbox over Docker**:

- Faster startup (~100ms vs ~2s)
- Hardware-level isolation (libkrun)
- No Docker daemon required
- Better for consulting environments with restricted Docker access

Sandboxes defined in workspace root `Sandboxfile` (not in `consulting_projects_tests/`).

## Testing & Validation

### Test Structure

```
tests/fastagency/    # FastAgency workflow tests
src/tests/          # Core AI module tests
notebooks/          # Interactive validation notebooks
```

### Run Tests

```powershell
# Via nox (see noxfile.py for all sessions)
nox -s test          # pytest with coverage
nox -s lint          # ruff + black linting
nox -s format        # auto-format code

# Direct pytest
pytest -v --tb=short --cov=src tests/

# VSCode tasks (automated)
Ctrl+Shift+P → Tasks: Run Task → "test"
```

### Notebook Validation

```powershell
# Data exploration workflow
jupyter lab notebooks/01_data_exploration.ipynb

# AG2 AutoBuild demo
jupyter lab notebooks/40_ag2_autobuild_demo.ipynb

# Web search integration
jupyter lab notebooks/50_ag2_web_search_demo.ipynb
```

## Consulting-Specific Patterns

### Audit Logging (Required for Compliance)

Every operation is logged to `artifacts.db`:

```python
from src.utils.audit import log_artifact, log_pipeline_run

# Log document ingestion
log_artifact(
    artifact_type="document",
    source_path="data/raw/client_report.pdf",
    output_path="data/processed/client_report.json",
    status="success",
    metadata={"pages": 42, "tables": 7}
)

# Log pipeline execution
run_id = log_pipeline_run(
    pipeline_name="data_ingestion",
    status="running",
    config={"batch_size": 100}
)
# ... pipeline execution ...
update_pipeline_run(run_id, status="completed", metrics={"processed": 100})
```

**SQLite schema** (`artifacts.db`):

- `artifacts` table - Ingested documents, chunks, processing status
- `runs` table - Pipeline execution records with timestamps
- `metrics` table - Performance and quality metrics

### Reproducibility Checklist

For every consulting project:

1. **Pin dependencies**: `pip freeze > requirements.txt`
2. **Document environment**: Python version, OS, key packages
3. **VSCode tasks**: Automate `create_venv`, `install_deps`, `test`
4. **Git-ignore sensitive data**: `.env`, `data/`, `artifacts.db` in `.gitignore`
5. **Audit trail**: Enable logging in `src/utils/audit.py`
6. **Local-only validation**: Test with `USE_LOCAL_EMBEDDINGS=true`

### Memory & Conversation Persistence

**SQLite conversation history** (`notebooks/memory/conversations.db`):

```python
from src.utils.memory import save_conversation, search_conversations

# Auto-saved during agent chat
save_conversation(
    agent_name="Data_Analyst",
    role="assistant",
    message="Q4 sales increased 25% YoY...",
    workflow="client_analysis",
    metadata={"client": "Acme Corp", "project": "Q4_Review"}
)

# Search past analyses
results = search_conversations(
    query="sales trends",
    workflow="client_analysis",
    limit=10
)
```

**ChromaDB semantic search** (`notebooks/memory/chromadb/`):

```python
from src.ai.rag_store import LocalDiskVectorStore

# Index past insights for semantic retrieval
vector_store = LocalDiskVectorStore(path="notebooks/memory/chromadb")
vector_store.add_texts(
    texts=["Q4 sales trends analysis...", "Customer churn patterns..."],
    metadatas=[{"date": "2025-12", "analyst": "AI"}]
)

# Find similar past analyses
similar = vector_store.similarity_search("quarterly sales performance", k=5)
```

## Common Gotchas

1. **Package metadata corruption**: If `import autogen` fails, run `pip cache purge; pip install --upgrade --force-reinstall importlib-metadata google-api-core google-auth` (don't rebuild venv - see `docs/FIX_METADATA_CORRUPTION.md`)

2. **MicroSandbox in WSL**: Server runs in WSL, not Windows. Always use `wsl bash -c "..."` commands or VSCode tasks. Check server status: `wsl bash -c "msb server status"`

3. **Captain agent library loading**: `agent_library_master.json` expects exact name matches - use `name.replace(" ", "_")` for lookups. Example: `"Data Analyst"` → `"Data_Analyst"`

4. **FastAgency UI not loading**: Ensure `GEMINI_API_KEY` is set in `.env` and `waitress-serve` is installed (`pip install waitress`).

5. **AG2 AutoBuild config**: Must point to `configs/oai_config_list.json` file path, not environment variable name, when using file-based config.

6. **Data privacy**: NEVER commit `data/` folder or `.env` file. Verify `.gitignore` includes:

   ```
   data/
   .env
   artifacts.db
   notebooks/memory/
   ```

7. **ChromaDB persistence**: Vector store saves to `notebooks/memory/chromadb/`. Backup this directory for conversation history retention.

8. **Audit log location**: `artifacts.db` is at workspace root. Use `sqlite3 artifacts.db` or DB Browser for SQLite to inspect.

## External Integration Points

- **AG2 Documentation**: https://docs.ag2.ai/latest/ - Reference for agent patterns
- **MicroSandbox**: https://github.com/e2b-dev/microsandbox - Sandbox architecture docs
- **FastAgency**: https://fastagency.ai/latest/ - Workflow & UI patterns
- **Gemini Models**: See `docs/GEMINI_MODELS.md` for model selection guide

## Quick Reference

| Task                              | Command/File                                                |
| --------------------------------- | ----------------------------------------------------------- |
| **Workflows**                     |                                                             |
| Start Jupyter analysis            | `jupyter lab` → `notebooks/01_data_exploration.ipynb`       |
| Run FastAgency web UI             | `Ctrl+Shift+B` or task "FastAgency: Run Mesop UI"           |
| Ingest client documents           | `Ctrl+Shift+P` → Tasks → "ingest_docs"                      |
| Create multi-agent system from NL | `python src/launch_ag2_autobuild.py run "task description"` |
| **Agent Development**             |                                                             |
| Load expert from library          | Parse `src/Agents/agent_library_master.json` by name        |
| Add new FastAgency workflow       | Edit `src/FastAgency/workflow.py` + add `@wf.register`      |
| Progressive agent examples        | `src/Agents/captain_agent_01_basic.py` → `03_with_tools.py` |
| **Execution & Testing**           |                                                             |
| Safe code execution               | `async with MicroSandboxLifecycleManager()` pattern         |
| Run tests                         | `nox -s test` or `Ctrl+Shift+P` → Tasks → "test"            |
| Format code                       | `nox -s format` (black + ruff)                              |
| **Data & Memory**                 |                                                             |
| Client data paths                 | `data/raw/` → `data/processed/` → `data/reports/`           |
| Conversation history              | `notebooks/memory/conversations.db` (SQLite)                |
| Semantic search                   | `notebooks/memory/chromadb/` (vector store)                 |
| Audit logs                        | `artifacts.db` (all operations logged)                      |
| **Quick References (Root)**       |                                                             |
| AG2 quick commands                | `AG2_QR01.md`                                               |
| VSCode tasks                      | `VSCODE_TASKS_QR02.md`                                      |
| FastAgency workflows              | `FASTAGENCY_QR03.md`                                        |
| **Documentation (Comprehensive)** |                                                             |
| Complete project guide            | `docs/COMPLETE_PROJECT_GUIDE.md`                            |
| Data handling & compliance        | `docs/DATA_HANDLING_POLICY.md`                              |
| Architecture overview             | `docs/PROJECT_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`      |
| Agent development guide           | `docs/AG2_AGENT_DEVELOPMENT_GUIDE.md`                       |
| All documentation index           | `docs/AG2_AGENT_LIBRARY_INDEX.md`                           |
| Installation guides               | `docs/AG2_AUTOBUILD_INSTALLATION.md` (+ 6 others in docs/)  |
| Change history                    | `docs/CHANGELOG.md`                                         |

## VSCode Automation (Critical for Reproducibility)

All project setup automated via VSCode tasks (`.vscode/tasks.json`):

```powershell
# Access tasks
Ctrl+Shift+P → "Tasks: Run Task"

# Key tasks:
- create_venv          # Create isolated Python environment
- install_deps         # Install from requirements.txt (pinned versions)
- test                 # Run pytest suite
- ingest_docs          # Process documents from data/raw/
- tests_to_notebooks   # Convert pytest tests to Jupyter notebooks
```

**Why this matters for consulting**:

- New team members onboard in <5 minutes
- Exact dependency versions reproduced across machines
- Client environments replicated precisely
- No manual setup documentation needed

---

## Key Consulting Workflows

### 1. Client Data Ingestion Workflow

```
Client provides data
    ↓
Place in data/raw/ (PDF, DOCX, XLSX, CSV)
    ↓
Run: Ctrl+Shift+P → Tasks → "ingest_docs"
    ↓
src/pipelines/ingest_docs.py
    ├→ Extract text (pymupdf, python-docx)
    ├→ Extract tables (pandas, openpyxl)
    ├→ Chunk semantically (src/ai/chunking.py)
    └→ Log to artifacts.db
    ↓
Output: data/processed/*.json, *.csv
    ↓
Index in ChromaDB (optional)
    ↓
Ready for agent analysis
```

### 2. Multi-Agent Analysis Workflow

```
Jupyter Notebook (01_data_exploration.ipynb)
    ↓
Load agents from library (333 options)
    ├→ Data_Analyst
    ├→ Statistician
    └→ Business_Consultant
    ↓
GroupChat orchestration
    ↓
Agents collaborate on client question
    ↓
MicroSandbox executes code safely
    ↓
Results + visualizations generated
    ↓
Conversation saved to notebooks/memory/conversations.db
    ↓
Export report to data/reports/
```

### 3. Reproducible Delivery Workflow

```
Development complete
    ↓
Pin dependencies: pip freeze > requirements.txt
    ↓
Document config: Update .env.example
    ↓
Audit review: Query artifacts.db for all operations
    ↓
Clean sensitive data: Remove data/, .env
    ↓
Package deliverable:
    ├→ Code (src/, notebooks/)
    ├→ Documentation (docs/)
    ├→ Setup automation (.vscode/tasks.json)
    └→ Requirements (requirements.txt, .env.example)
    ↓
Client can reproduce exactly via VSCode tasks
```

---

_For complete architecture, see `docs/PROJECT_ARCHITECTURE.md` and `docs/ARCHITECTURE.md`. For agent development patterns, see `docs/AG2_AGENT_DEVELOPMENT_GUIDE.md`._
