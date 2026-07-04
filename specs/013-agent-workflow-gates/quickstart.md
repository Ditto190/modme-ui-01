# Quickstart: Agent Workflow Gates

Copy-paste commands for worktrees. You do **not** need to rename your git branch.

## 1. Point speckit at this feature

```powershell
cd C:\Users\dylan\Monorepo_ModMe
$env:SPECIFY_FEATURE = "013-agent-workflow-gates"
```

## 2. Install git hooks (worktrees included)

```powershell
yarn hooks:install
yarn worktree:doctor
```

The `hooks` row should show **ok**.

## 3. Run a pattern gate

```powershell
node scripts/lib/run-pattern-gate.mjs --pattern federated-dual-stack
```

Other pattern IDs: `path-filtered-ci`, `contract-first-integration`, `bounded-parallel-agents`, `ecl-structured-change`.

## 4. Requirements-quality checklist (agent)

In Cursor chat:

```
/speckit-pattern-checklist federated-dual-stack
```

Or full speckit:

```
/speckit.checklist
```

(Checklists test whether the **spec is written well**, not whether code runs.)

## 5. Verify everything

```powershell
node --test scripts/__tests__/pattern-coverage.test.mjs
yarn lint:harness
yarn molecule-index:verify
.\.specify\scripts\powershell\check-prerequisites.ps1 -Json
```

## 6. Session finish (when ready to commit)

```powershell
.\scripts\agent-session-finish.ps1 -PatternGate federated-dual-stack -VerifyStack -Yes -CommitMessage "feat(workflow): ..." -Push -CreatePr
```

## What each piece does

| Piece                        | Plain English                                           |
| ---------------------------- | ------------------------------------------------------- |
| `workflow-from-chats`        | Mines your chat history for durable preferences         |
| `speckit.checklist`          | Unit tests for requirements writing                     |
| `patterns/coverage-map.json` | Links architecture ideas to folders and `yarn` commands |
| ECL harness                  | Runs after requirements are clear — actual code changes |
