# Spec: Agent Workflow Gates (013)

## Objective

Encode repeatable agent workflow gates for ModMe's **federated dual-stack** (next-forge + GenerativeUI) so chat-mined preferences, architecture patterns, and requirements-quality checklists align with executable verification before implementation.

**Users:** Cursor/Copilot agents and human reviewers in worktrees.

**Success looks like:** Every structured review or harness change runs workflow-from-chats → speckit checklist → pattern verify commands with traceable gaps in `tasks.md` or ECL `CHANGE.md`.

## Tech Stack

- Root Yarn orchestration + Turborepo (next-forge) + Yarn 3 (GenerativeUI)
- Speckit (`.specify/`) for requirements-quality checklists
- ECL harness (`harness/`, `docs/ECL.md`) for implementation
- Pattern registry: `specs/013-agent-workflow-gates/patterns/`

## Commands

```powershell
$env:SPECIFY_FEATURE = "013-agent-workflow-gates"
yarn hooks:install
yarn worktree:doctor
yarn lint:harness
yarn molecule-index:verify
yarn pre-commit:check
node scripts/lib/run-pattern-gate.mjs --pattern federated-dual-stack
.\.specify\scripts\powershell\check-prerequisites.ps1 -Json
```

## Project Structure

```
specs/013-agent-workflow-gates/
  spec.md, plan.md, research.md, tasks.md, quickstart.md
  patterns/registry.json, patterns/coverage-map.json
  checklists/*.md          # speckit requirements-quality gates
  preferences/<date>.json  # workflow-from-chats atoms
.cursor/skills/modme-workflow-speckit-bridge/
scripts/lib/run-pattern-gate.mjs
scripts/__tests__/pattern-coverage.test.mjs
```

## Workflow Preferences

| Trigger            | Rule                                                               | Confidence |
| ------------------ | ------------------------------------------------------------------ | ---------- |
| Dual-monorepo work | Federated model; HTTP/WS + golden schemas only                     | Strong     |
| Feature work       | Worktree mandatory; never main checkout                            | Strong     |
| Pre-PR review      | Run speckit checklist for active pattern before parallel explorers | Strong     |
| Session finish     | Pattern verify + path-filtered verify stack                        | Strong     |

## Integration

- **next-forge ↔ GenerativeUI:** `@repo/schemas`, CopilotKit proxy, agent-server HTTP/WS — no relative cross-monorepo imports
- **Contracts:** Vitest golden fixtures in `next-forge/packages/schemas/`; molecule manifest in `data/molecule-index/`
- **CI equivalent:** `yarn verify:forge` / `yarn verify:generative` driven by `scripts/lib/stack-paths.json` (ModMe's cross-stack `--affected`)

## Testing Strategy

| Concern                | Gate                                                      |
| ---------------------- | --------------------------------------------------------- |
| Pattern registry drift | `node --test scripts/__tests__/pattern-coverage.test.mjs` |
| Harness / boundaries   | `yarn lint:harness`                                       |
| Schema contracts       | `yarn molecule-index:verify`                              |
| Hooks in worktrees     | `yarn hooks:install` + `yarn worktree:doctor`             |
| Requirements quality   | `/speckit.checklist` or `/speckit-pattern-checklist`      |

## Boundaries

**Always:**

- Run `yarn worktree:ensure` before feature work
- Set `$env:SPECIFY_FEATURE` when branch is not `NNN-name` speckit format
- Resolve checklist `[Gap]` items before ECL implementation

**Ask first:**

- New pattern IDs in `registry.json`
- New verify commands in `coverage-map.json`
- Changing `stack-paths.json` CI globs

**Never:**

- `workspace:*` across next-forge and GenerativeUI
- Merge or convert lockfiles between stacks
- Skip speckit checklist for structured harness changes

## Success Criteria

- [ ] `yarn hooks:install` passes in linked worktrees; doctor reports hooks ok
- [ ] All patterns in `registry.json` have coverage-map entries with existing paths (5 workflow + 6 `uw-archive` nonMigrate)
- [ ] `pattern-coverage.test.mjs` passes in CI/pre-commit path
- [ ] `yarn pattern:uw` and `yarn pattern:e2e` pass for UW archive catalogue
- [ ] Four checklist domains exist with ≥80% traceability tags (`monorepo-boundaries`, `ci-architecture`, `contracts`, `uw-archive`)
- [ ] `modme-workflow-speckit-bridge` skill documents the 6-step pipeline

## Open Questions

- Future: dependency-cruiser on `next-forge/apps/app` for layer rules (see `research.md`)
