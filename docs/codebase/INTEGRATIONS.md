# Integrations

## Core Sections (Required)

### 1) External Services

| Service | Purpose | Evidence |
|---------|---------|----------|
| OpenAI API | Backs the AG2 multi-agent group chat | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| CopilotKit | AI Chat Interface UI on Frontend | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| Buildkite MCP | Remote MCP server for CI pipeline control | `docs/agent-tech-guide.md` |
| Mantine MCP | UI component documentation lookups | `docs/agent-tech-guide.md` |

### 2) Authentication and Credentials

- Managed via `.env` files locally.
- Backend `.env` requires `OPENAI_API_KEY`.
- Buildkite remote MCP uses OAuth.
- No other secrets explicitly required (Mantine uses npx, no key).

### 3) Databases and Persistence

- [TODO] Identify if there is a persistent database for saving chat history. The codebase scan did not indicate a standard relational DB (e.g., Postgres).

### 4) Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
- `docs/agent-tech-guide.md`
