# Concerns

## Core Sections (Required)

### 1) Technical Debt and Churn

- High-churn files: `CHANGELOG.md` (4), `docs/agent-tech-guide.md` (4), `scripts/cursor-ai/setup.ps1` (3). Suggests that agent configurations and documentation are frequently updated.
- TODOs/FIXMEs: Most TODOs in the scan originate from the Python standard library in the `.conda` environment, and some from `scripts/scan.py`. No major application-level TODOs detected by the scan.

### 2) Architectural Risks

- State Desync: Frontend relies on WebSocket streaming from the AG2 backend. Desynchronization or reconnection drops could break the GenerativeCanvas.
- Agent Orchestration: Multi-agent interaction on the backend might hit rate limits or context window limits with the OpenAI API.

### 3) Operational Constraints

- Multi-Agent Workspace Isolation: Concurrent agents MUST use isolated git worktrees (`scripts/new-agent-worktree.ps1`) to avoid git and port conflicts.
- Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless explicitly requested.

### 4) Evidence

- `docs/codebase/.codebase-scan.txt`
- `AGENTS.md`
- `docs/agent-tech-guide.md`
