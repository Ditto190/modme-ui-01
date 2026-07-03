# Integrations

## Core Sections (Required)

### 1) External Services

| Service | Purpose | Evidence |
|---------|---------|----------|
| **Supabase (hosted)** | Primary Postgres + pgvector for next-forge (`modme-next-forge`) | `docs/supabase-cloud-setup.md`, `next-forge/packages/database` |
| **OpenAI / LLM providers** | AG2 multi-agent backend (GenerativeUI agent-server) | `GenerativeUI_monorepo/README_GENERATIVE_UI.md`, agent-server `.env` |
| **Google Gemini** | Legacy root `agent/` ADK stack (deprecated) | `agent/main.py`, `.env.example` `GOOGLE_API_KEY` |
| **Mintlify** | next-forge docs site (port 3104) | `next-forge/apps/docs`, `launch-manifest.json` |
| **Liveblocks** | Real-time collaboration in next-forge app | `@repo/collaboration` package |
| **Auth.js** | next-forge authentication (not Supabase Auth middleware) | `@repo/auth`, `next-forge/apps/app` |

### 2) Authentication and Credentials

| Area | Mechanism | Config | Evidence |
|------|-----------|--------|----------|
| next-forge app | Auth.js credentials | `AUTH_SECRET`, app `.env.local` | `next-forge/SETUP.md` |
| Supabase | Service role + publishable key | Root `.env`, `next-forge/packages/database/.env` | `docs/supabase-agent-hybrid.md` |
| agent-server | API keys in `.env` | `OPENAI_API_KEY`, etc. | `apps/agent-server/.env.example` |
| CI | Secret guard — no tracked `.env` | `.github/workflows/ci.yml` `secret-guard` job |

### 3) Databases and Persistence

| Store | Role | Evidence |
|-------|------|----------|
| **Supabase Postgres** | next-forge Prisma models, inbox/knowledge pgvector | `next-forge/packages/database/prisma/schema.prisma` |
| **GreptimeDB** (optional) | Code/AST intake index | `docs/inbox-pipeline/README.md` |
| **Local SQLite / Chroma** | Legacy root `agent/` R&D (deprecated) | `CLAUDE.md` data directory notes |
| **artifacts.db** | Audit logs (gitignored) | `src/utils/audit.py` (legacy root) |

WebSocket agent state is **ephemeral stream** — persisted UI state lives in client + optional DB via next-forge app.

### 4) Agent ↔ UI Integration

| Channel | Endpoint | Contract | Evidence |
|---------|----------|----------|----------|
| WebSocket | `ws://localhost:8000/ws/agent` | `@repo/schemas` / Pydantic mirror | `C4-Documentation/apis/agent-server-api.yaml` |
| HTTP | next-forge API webhooks | REST | `next-forge/apps/api` |
| Schema parity | Golden JSON | Vitest + pytest | `ws-contract.test.ts`, `test_schemas_contract.py` |

### 5) Evidence

- `docs/codebase/.codebase-scan.txt` (ENV templates section)
- `harness/config/environment.json`
- `next-forge/SETUP.md`
- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
- `docs/supabase-setup.md`, `docs/supabase-cloud-setup.md`
