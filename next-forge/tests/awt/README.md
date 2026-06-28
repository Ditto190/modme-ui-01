# AWT — GenerativeCanvas visual smoke

[AWT (AI Watch Tester)](https://github.com/ksgisang/AI-Watch-Tester) supplements Playwright with declarative YAML scenarios and OCR/template visual matching. Use it for GenerativeCanvas UX regression (streaming text, dynamic component registry) where DOM selectors are brittle.

## AWT skill install status

| Step | Command | Status |
|------|---------|--------|
| Agent skill | `npx skills add ksgisang/awt-skill --skill awt -g -y` | **Partial success** — skill installed to `~/.agents/skills/awt` (v1.5.0). One symlink target failed: PromptScript does not support global skill installation (safe to ignore for Cursor). |
| AWT CLI (`aat`) | See manual install below | **Not on PATH** — install the Python CLI before running scenarios. |

### Manual install (skill + CLI)

If the `npx skills` command fails or `aat` is missing:

```powershell
# 1. Agent skill (Cursor / Copilot / Claude Code)
npx skills add ksgisang/awt-skill --skill awt -g -y

# 2. AWT CLI + Playwright browser (from repo root or any venv)
pip install aat-devqa
playwright install chromium

# 3. Verify
aat --help
```

Alternative: clone and editable-install from [AI-Watch-Tester](https://github.com/ksgisang/AI-Watch-Tester):

```powershell
git clone https://github.com/ksgisang/AI-Watch-Tester.git
cd AI-Watch-Tester
pip install -e .
playwright install chromium
```

Skill reference (after install): `~/.agents/skills/awt/SKILL.md`  
ModMe wrapper skill: `external/awesome-Antigravity/skills/awt-e2e-testing/SKILL.md`

## Prerequisites

1. **Signed in** — `/en/generative-ui` lives under `(authenticated)`; unauthenticated users redirect to sign-in.
2. **Dev stacks running** (from repo root):

```powershell
. .\scripts\load-worktree-ports.ps1   # optional: worktree port offsets
yarn dev:forge:core                   # app :3100, web :3101, api :3102
yarn dev:generative                   # agent-server :8000
```

3. Open the app: [http://localhost:3100/en/generative-ui](http://localhost:3100/en/generative-ui)

| Service | Port | Role |
|---------|------|------|
| next-forge `apps/app` | 3100 | GenerativeCanvas UI |
| GenerativeUI agent-server | 8000 | WebSocket agent backend |

## Scenarios

| File | Purpose |
|------|---------|
| `generative-canvas-smoke.yaml` | Page load, heading, chat chrome, optional Connected state, screenshot capture |

Validate YAML without running the browser:

```powershell
cd next-forge
aat validate tests/awt/generative-canvas-smoke.yaml
```

## Run (local)

From `next-forge/` with stacks up and an authenticated session in the browser profile AWT uses:

```powershell
# Optional: scan first to refresh element map (recommended by AWT skill)
aat scan --url http://localhost:3100/en/generative-ui

# Execute smoke (headed — do not force headless)
aat run tests/awt/generative-canvas-smoke.yaml --skill-mode

# Visual regression (after first baseline capture)
aat snapshot tests/awt/generative-canvas-smoke.yaml --url http://localhost:3100
aat diff tests/awt/generative-canvas-smoke.yaml --url http://localhost:3100
```

Override base URL via scenario `variables.base_url` or project config (`aat.config.yaml` → `url`).

## Auth note

Playwright specs in `tests/e2e/` should own sign-in flows. AWT scenarios here assume you are already signed in (manual login once, or extend with a dedicated auth YAML later).

## Integration gate (not run in Lane E)

Full stack verification is deferred to the orchestration integration phase:

```powershell
yarn verify:forge
cd next-forge && npx bun run test:e2e
# then AWT against running stacks
```

Do not run the full integration gate until Lane C–D changes are merged and stacks are stable.
