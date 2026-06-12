# AGENTS.md â€” Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot working in this repository.

## Repository layout
- **`GenerativeUI_monorepo/`** â€” main Turborepo (Yarn 3 workspaces, Turbo)
  - `apps/` â€” applications (web, API, agent, dashboard, etc.)
  - `packages/` â€” shared libraries and example apps
  - `UniversalWorkbench/` â€” workbench monorepo variant (staging/dev copies also exist)
- **`.cursor/rules/`** â€” Cursor project rules (MDC). Includes lean-ctx, PatrickJS, sanjeed5, awesome-copilot.
- **`.agents/skills/`** â€” Agent skills (Cursor + Copilot compatible SKILL.md format)
- **`.github/copilot-instructions.md`** â€” always-on Copilot instructions
- **`.github/instructions/`** â€” file-scoped Copilot instructions from awesome-copilot
- **`.vendor/awesome-copilot-main/`** â€” vendored github/awesome-copilot (refresh via setup script)

## Default commands
From `GenerativeUI_monorepo/`:
```bash
yarn install
yarn dev          # turbo run dev
yarn build        # turbo run build
yarn test         # monorepo test runner
yarn lint         # turbo run lint
```

Per-package scripts vary (Vite/Biome/Vitest vs Next.js). Check the nearest `package.json`.

## Agent behavior
1. Read `package.json` in the target package before changing build/test commands.
2. Use workspace protocol dependencies (`workspace:*`) for internal packages.
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless the task explicitly targets them.
4. Run verification in the affected package before marking work complete.
5. For browser/UI work, use Cursor browser MCP skills (`visual-qa-testing`, `verifying-in-browser`).

## Updating AI configuration
```powershell
.\scripts\cursor-ai\setup.ps1
```

## Workspace docs (all agents)

- **Onboarding:** run `/init` in Cursor (beads + debug setup + doc map)
- [`docs/agent-tech-guide.md`](docs/agent-tech-guide.md) — lean-ctx, skills-sh MCP, installed skills, changelog workflow
- [`docs/debug-launch-guide.md`](docs/debug-launch-guide.md) — VS Code `launch.json`, ports, adding apps, CI validation
- [`CHANGELOG.md`](CHANGELOG.md) — append under `[Unreleased]` per Agent Update Protocol
- [`GenerativeUI_monorepo/AGENTS.md`](GenerativeUI_monorepo/AGENTS.md) — Turborepo commands and package layout

## External references
- [awesome-copilot](https://github.com/github/awesome-copilot) â€” community agents, instructions, skills
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)
