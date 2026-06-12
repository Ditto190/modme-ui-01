# Debug & Launch Configuration Guide

How to use VS Code / Cursor debug configs in **Monorepo_ModMe**, keep them in sync with CI, and add new apps safely.

| Audience | Start here |
|----------|------------|
| New contributor | Run `/init` in Cursor chat |
| Agent session | `AGENTS.md` → this guide → `.vscode/launch.json` |
| CI maintainer | `scripts/validate-launch-json.mjs`, `.github/workflows/launch-json-check.yml` |

---

## 1. File layout

```
.vscode/
├── launch.json          # Debug configurations + compounds
├── tasks.json           # preLaunchTask targets (Vite, tsc build)
└── extensions.json      # Python, debugpy, ESLint, Prettier

scripts/
├── launch-manifest.json # Source of truth: apps, ports, required names
└── validate-launch-json.mjs

.github/workflows/
└── launch-json-check.yml
```

**Rule:** `launch.json` is what VS Code runs; `launch-manifest.json` is what CI checks against. Change both together.

---

## 2. Available debug configurations

### Primary apps (`GenerativeUI_monorepo/apps/`)

| Name | Type | Port | Notes |
|------|------|------|-------|
| Web Dashboard (Next.js) | `node-terminal` | **3001** | Avoids clash with Vibe on 3000; auto-opens Chrome when ready |
| Vibe Web App (Chrome) | `chrome` + task | **3000** | Starts Vite via `vibe-web-app: dev` task |
| Agent Server (FastAPI) | `debugpy` / uvicorn | **8000** | Loads root `.env` via `envFile` |
| Agent Generator: build + current test | `node --test` | — | Builds first via `agent-generator: build` |
| Agent Generator: schema crawler | `node` | — | Runs `dist/mcp-registry/schema-crawler.js` after build |

### Template packages (`GenerativeUI_monorepo/packages/`)

| Name | Port |
|------|------|
| Example Next: dev server | 3002 |
| Example React: dev server | 3003 |

Jest configs use `yarn jest --runInBand` on the **current file** in each package.

### Compounds

- **Full Stack: Agent Server + Web Dashboard** — backend + Next UI
- **Full Stack: Agent Server + Vibe Web App** — backend + Vite playground

### Utility

- **Node: current file** — debug whatever file is open (`${file}`)

---

## 3. Prerequisites

### One-time setup

```powershell
# From repo root
cd GenerativeUI_monorepo
yarn install

cd apps/agent-server
poetry install
# Windows venv alternative:
# python -m venv venv
# .\venv\Scripts\activate
# pip install -r requirements.txt
```

### Environment

- Root `.env` is used by Agent Server (`envFile` in launch.json).
- Reference **variable names** in docs only (`OPENAI_API_KEY`, `PORT`, `HOST`, `CORS_ORIGINS`).
- Never commit secrets.

### Extensions

Install recommendations when prompted, or from `.vscode/extensions.json`:

- `ms-python.python` + `ms-python.debugpy` — FastAPI debugging
- `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` — TS/JS quality of life

---

## 4. How to debug (daily workflow)

1. **Run and Debug** panel (`Ctrl+Shift+D`).
2. Select configuration from dropdown.
3. **F5** to start.
4. Set breakpoints in source (TS, JS, Python).
5. For browser apps, use Chrome configs or `serverReadyAction` on Next.js.

### Full stack

Choose a **compound** configuration. Both processes start; **Stop** ends all (`stopAll: true`).

### Attach instead of launch

- **Web Dashboard (attach Chrome)** — when `yarn dev` already running on 3001
- **Agent Server (attach)** — when uvicorn started with debugpy on port 5678
- **Vibe Web App (attach Chrome)** — remote debugging port 9222

---

## 5. Validation (local + CI)

### Local

```powershell
# Structure, paths, tasks, manifest sync
node scripts/validate-launch-json.mjs --require-manifest-sync
```

Warnings for missing `dist/` or `node_modules` are expected before first build/install.

### CI

`.github/workflows/launch-json-check.yml` runs on PR/push when launch files change:

1. Builds `agent-generator` (so `dist/` paths resolve)
2. Runs validator with `--require-manifest-sync`

---

## 6. Adding a new app

When you add `GenerativeUI_monorepo/apps/<new-app>`:

### Step 1 — Choose port

Check `scripts/launch-manifest.json` for used ports. Pick an unused port (3004+).

### Step 2 — Add launch configuration

Edit `.vscode/launch.json`. Patterns:

**Next.js / Node dev server:**

```json
{
  "name": "My App (Next.js)",
  "type": "node-terminal",
  "request": "launch",
  "command": "yarn dev",
  "cwd": "${workspaceFolder}/GenerativeUI_monorepo/apps/my-app",
  "env": { "PORT": "3004" }
}
```

**Vite + Chrome:**

```json
{
  "name": "My App (Chrome)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3004",
  "webRoot": "${workspaceFolder}/GenerativeUI_monorepo/apps/my-app/src",
  "preLaunchTask": "my-app: dev"
}
```

Add matching **background task** in `.vscode/tasks.json` if using `preLaunchTask`.

**Python (FastAPI):**

```json
{
  "name": "My API (FastAPI)",
  "type": "debugpy",
  "request": "launch",
  "module": "uvicorn",
  "args": ["src.main:app", "--reload", "--host", "127.0.0.1", "--port", "8001"],
  "cwd": "${workspaceFolder}/GenerativeUI_monorepo/apps/my-api",
  "envFile": "${workspaceFolder}/.env"
}
```

### Step 3 — Update manifest

Add entry to `scripts/launch-manifest.json`:

```json
{
  "id": "my-app",
  "name": "My App (Next.js)",
  "cwd": "GenerativeUI_monorepo/apps/my-app",
  "port": 3004,
  "packageJson": "GenerativeUI_monorepo/apps/my-app/package.json",
  "devScript": "dev"
}
```

Add the `name` to `requiredLaunchNames` if it is a primary target.

### Step 4 — Validate

```powershell
node scripts/validate-launch-json.mjs --require-manifest-sync
```

### Step 5 — Document

- Append bullet under `CHANGELOG.md` `[Unreleased]` if user-facing or agent-relevant.
- No need to duplicate full config in changelog — point to this guide.

---

## 7. How this guide relates to `agent-tech-guide.md`

| Topic | Where |
|-------|-------|
| lean-ctx, skills-sh, MCP | `docs/agent-tech-guide.md` |
| Changelog CI | `docs/agent-tech-guide.md` §6 |
| **Debug / launch.json** | **this file** |
| Onboarding slash command | `.cursor/commands/init.md` → run `/init` |

Agents: read `agent-tech-guide.md` for repo-wide tooling; read **this file** before editing `.vscode/launch.json`.

---

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Change `PORT` in launch env or stop other dev server |
| Python config not found | Install `ms-python.debugpy`; run `poetry install` in agent-server |
| `preLaunchTask` not found | Add task label to `.vscode/tasks.json` |
| Jest debug fails | Run `yarn install` in monorepo; open a test file first |
| CI launch-json-check fails | Run validator locally; sync manifest + launch.json |
| `dist/` missing for agent-generator | `cd GenerativeUI_monorepo/apps/agent-generator && yarn build` |

---

## 9. Quick commands

```powershell
# Validate debug config
node scripts/validate-launch-json.mjs --require-manifest-sync

# Install monorepo deps
cd GenerativeUI_monorepo && yarn install

# Build agent-generator for dist-based debug targets
cd GenerativeUI_monorepo/apps/agent-generator && yarn build

# Onboard (beads + debug + docs map)
# In Cursor chat: /init
```

---

*Last updated: 2026-06-12 — launch.json, manifest validator, and CI workflow added.*
