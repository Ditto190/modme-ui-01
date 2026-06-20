---
description: Onboard this repo — beads issue tracking, VS Code debug configs, and agent guides
argument-hint: [beads-prefix]
---

# Project init — Monorepo_ModMe

Run this when joining the repo or starting a new agent session. Complete **four phases** unless the user only asked for one.

Optional argument `$ARGUMENTS`: beads issue prefix (e.g. `modme` → `modme-1`, `modme-2`). Default: `modme`.

---

## Phase 1 — Beads issue tracking

Initialize persistent, git-backed task memory for multi-session work.

1. Check whether beads is already initialized (`.beads/` exists or `bd stats` succeeds).
2. If **not** initialized:
   - Use the beads MCP `init` tool with prefix from `$ARGUMENTS` (or `modme` if empty).
   - Fallback (no MCP): `yarn beads:init` or `bd init --prefix modme` from repo root.
   - Report database location and issue prefix.
   - Suggest creating issues via beads MCP `create` or `/beads:create` when available.
3. If **already** initialized:
   - Use beads MCP `stats` and summarize open/ready issues.
   - Do not re-init.

**When to use beads vs in-chat todos:** Use beads when work spans sessions, has dependencies, or must survive context compaction. Use chat todos for single-session linear tasks.

---

## Phase 2 — VS Code / Cursor debug setup

This repo ships curated debug configs for **both** monorepos. Verify they are usable and explain them to the user.

### Key files

| File | Purpose |
|------|---------|
| `.vscode/launch.json` | Debug configurations (Run and Debug panel) |
| `.vscode/tasks.json` | `preLaunchTask` helpers (Vite dev, agent-generator build, forge docs/storybook) |
| `scripts/launch-manifest.json` | Source of truth for app names, ports, cwds |
| `scripts/validate-launch-json.mjs` | Local + CI validator |
| `docs/debug-launch-guide.md` | Human/agent guide for debugging |

### Debug targets — GenerativeUI (legacy)

| Configuration | Stack | Port |
|---------------|-------|------|
| Web Dashboard (Next.js) | Next 14 + CopilotKit | 3001 |
| Vibe Web App (Chrome) | Vite 5 | 3000 |
| Agent Server (FastAPI) | Python / uvicorn | 8000 |
| Example Next / React | Template packages | 3002 / 3003 |

**Compounds:** `Full Stack: Agent Server + Web Dashboard`, `Full Stack: Agent Server + Vibe Web App`.

### Debug targets — next-forge (primary)

| Configuration | Stack | Port |
|---------------|-------|------|
| next-forge App (SaaS) | Next 16 + Bun | 3100 |
| next-forge Web (Marketing) | Next 16 + Bun | 3101 |
| next-forge API | Next 16 + Bun | 3102 |
| next-forge Docs (Mintlify) | Mintlify | 3104 |
| next-forge Storybook (Workshop) | Storybook 10 | 6106 |

**Compound:** `Full Stack: Forge Core + Agent Server` (3100–3102 + 8000).

### Prerequisites checklist

Run or instruct the user to run:

```powershell
# next-forge (primary)
yarn dev:forge:supabase          # Docker Supabase
cd next-forge && bun install && bun run db:push
# copy next-forge/.env.example → .env.local (Auth.js dev@modme.local)

# GenerativeUI (legacy)
cd GenerativeUI_monorepo && yarn install
cd apps/agent-server && poetry install

# Root env (variable names only — never commit values)
# Copy .env.example → .env if needed; OPENAI_API_KEY, PORT, etc.
```

### Recommended extensions

From `.vscode/extensions.json`: `ms-python.python`, `ms-python.debugpy`, ESLint, Prettier.

### Validate launch config

```powershell
node scripts/validate-launch-json.mjs --require-manifest-sync
```

If validation fails, read `docs/debug-launch-guide.md` § "Adding a new app" and fix `launch.json` + `launch-manifest.json` together.

### How to start debugging (user)

1. Open **Run and Debug** (`Ctrl+Shift+D`).
2. Pick a configuration from the dropdown (e.g. `next-forge App (SaaS)` or `Web Dashboard (Next.js)`).
3. Press **F5**.
4. For full stack, use a **compound** configuration.

---

## Phase 3 — Agent documentation map

Point the user (or future agents) to the layered docs:

| Layer | File | Use when |
|-------|------|----------|
| Entry | `AGENTS.md` | Commands, layout, agent behavior |
| **Index** | `docs/agent-index.md` | Dual-monorepo map, ports, skills, drift register |
| Deep guide | `docs/agent-tech-guide.md` | lean-ctx, skills, changelog, CI, **debug** |
| Debug focus | `docs/debug-launch-guide.md` | launch.json setup, ports, CI sync |
| Worktrees | `docs/multi-agent-worktrees.md` | **Mandatory** for feature work |
| Stack | `docs/codebase/STACK.md` | Package managers, ports, setup status |
| Migration | `.agents/skills/modme-generative-ui-migrate/SKILL.md` | GenerativeUI → next-forge phases |
| CI automation | `.agents/skills/cicd-automation-workflow-automate/SKILL.md` | Pipeline design and consolidation |
| Buildkite | `docs/buildkite-guide.md` | GenerativeUI Buildkite pipeline |
| Changelog | `CHANGELOG.md` | Notable changes under `[Unreleased]` |
| lean-ctx | `docs/lean-ctx-guide.md` | Context compression diagnostics |

**Key repo skills:** `next-forge`, `modme-generative-ui-migrate`, `smart-git-automation`, `github-actions-efficiency`.

**End-of-session checklist** (from agent-tech-guide):

1. Append `CHANGELOG.md` if change is notable.
2. Update `AGENTS.md` or `docs/agent-index.md` if commands/layout changed.
3. Update `docs/agent-tech-guide.md` or `docs/debug-launch-guide.md` if tooling/workflows changed.
4. Run `node scripts/validate-changelog.mjs --require-update` before push when monitored paths changed.

---

## Phase 4 — Suggested first beads issues

If beads was just initialized, offer to create starter issues:

1. **chore**: Verify compound `Full Stack: Forge Core + Agent Server`
2. **chore**: CI Phase A dedupe — confirm pre-commit vs ci.yml split
3. **task**: Migration Phase 4 — feature-flag cutover for generative-ui route
4. **chore**: Confirm `yarn verify:forge` + `yarn verify:generative` documented
5. **task**: Any active feature the user is working on

Use beads MCP `create` or `/beads:create` when available.

---

## Output format

After running, respond with:

1. **Beads** — initialized or stats summary
2. **Debug** — which configs exist, prerequisites met/missing, validation result
3. **Docs** — links to `docs/agent-index.md`, `docs/debug-launch-guide.md`, and `docs/agent-tech-guide.md`
4. **Next step** — one concrete action (F5 a config, install deps, or create first beads issue)

Do not commit `.env` or print secret values.
