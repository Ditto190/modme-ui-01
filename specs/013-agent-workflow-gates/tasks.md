# Tasks: Agent Workflow Gates

- [x] Task: Fix git hooks path for linked worktrees
  - Acceptance: `install-git-hooks.ps1` uses `git rev-parse --git-path hooks`; doctor uses same
  - Verify: `yarn hooks:install && yarn worktree:doctor`
  - Files: `scripts/install-git-hooks.ps1`, `scripts/worktree-doctor.ps1`

- [x] Task: Create spec bundle and pattern registry
  - Acceptance: `specs/013-agent-workflow-gates/` with spec, plan, research, patterns JSON
  - Verify: files exist; `check-prerequisites.ps1 -Json` passes with `SPECIFY_FEATURE` set
  - Files: `specs/013-agent-workflow-gates/**`

- [x] Task: Bridge skill and command
  - Acceptance: `modme-workflow-speckit-bridge` skill + `speckit-pattern-checklist` command
  - Verify: skill lists 6 steps; collection references bridge
  - Files: `.cursor/skills/modme-workflow-speckit-bridge/`, `.cursor/commands/`

- [x] Task: Pattern coverage test and gate runner
  - Acceptance: test validates paths and yarn scripts; `run-pattern-gate.mjs` runs verify for pattern id
  - Verify: `node --test scripts/__tests__/pattern-coverage.test.mjs`
  - Files: `scripts/__tests__/pattern-coverage.test.mjs`, `scripts/lib/run-pattern-gate.mjs`

- [x] Task: Generate requirement-quality checklists
  - Acceptance: three checklist files with CHK001+ numbering and traceability tags
  - Verify: manual review; ≥80% items have Spec/Gap/Conflict tags
  - Files: `specs/013-agent-workflow-gates/checklists/*.md`

- [x] Task: Full verification matrix
  - Acceptance: harness lint, molecule verify, pattern test, doctor hooks ok
  - Verify: pattern test PASS; hooks doctor ok; speckit prereqs ok
  - Note: harness ci.yml sync gaps and vitest rolldown binding are pre-existing env issues
  - Files: (none — run only)
