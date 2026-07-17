# Monorepo_ModMe â€” GitHub Copilot instructions

Primary codebase: `GenerativeUI_monorepo/` (Turborepo + Yarn workspaces).

## Stack
- TypeScript (strict), React 18, Vite, TanStack Router/Query
- Tailwind CSS; Adobe React Spectrum in `@adaptiveworx/ui`
- Next.js apps exist under `packages/example-next-application` and workbench envs
- Supabase where configured; prefer RLS and server-side `getUser()` over `getSession()`

## Monorepo conventions
- Run tasks from package roots or via `turbo run <task>` from `GenerativeUI_monorepo/`
- Respect workspace package boundaries (`apps/*`, `packages/*`)
- Match existing ESLint/Biome/Prettier config per package
- Keep changes minimal; do not refactor unrelated code

## Agent resources in this repo
- Cursor rules: `.cursor/rules/` (PatrickJS, sanjeed5 MDC, awesome-copilot conversions)
- Cursor/Copilot skills: `.agents/skills/` (symlinked from awesome-copilot selection)
- Vendor sources: `.vendor/awesome-copilot-main/` (update via `scripts/cursor-ai/setup.ps1`)
- Full awesome-copilot catalog: https://awesome-copilot.github.com

## Quality bar
- Verify with package scripts (`test`, `lint`, `type-check`) before claiming done
- Prefer TDD for new behavior; run existing tests after edits
- For PRs: conventional commits, focused diffs, no secrets in repo

See also per-file instructions in `.github/instructions/` (from github/awesome-copilot).