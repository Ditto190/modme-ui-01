---
name: modme-workflow-speckit-bridge
description: Bridge chat-mined preferences, monorepo-architect patterns, and speckit requirements-quality checklists for ModMe dual-stack workflow gates. Use when encoding preferences from chats, pre-PR architecture review, starting structured harness/ECL changes, or running pattern coverage verify before session finish.
---

# ModMe Workflow Speckit Bridge

Connects **workflow-from-chats** → **spec preferences** → **pattern registry** → **speckit.checklist** → **tasks/ECL** → **coverage verify** for federated next-forge + GenerativeUI work.

## When to use

- User asks to mine chat preferences into durable workflow rules
- Thermo-nuclear or migration review **before** parallel explorer waves
- Starting or closing an ECL harness change that touches both stacks
- Session finish needs pattern gates (`-PatternGate`)

## Prerequisites

- Worktree checkout (`yarn worktree:ensure`)
- `$env:SPECIFY_FEATURE = "013-agent-workflow-gates"` when branch is not `NNN-name` format
- Active spec at `specs/013-agent-workflow-gates/`

## Six-step pipeline

### 1. Extract preferences

Run **workflow-from-chats** on recent parent transcripts (default 7 days).

Write strong/medium atoms to:

```
specs/013-agent-workflow-gates/preferences/<YYYY-MM-DD>.json
```

### 2. Merge into spec

Add durable rules to `spec.md` §Workflow Preferences. Skip weak/contradicted atoms unless user confirms.

### 3. Select architecture pattern(s)

Load `specs/013-agent-workflow-gates/patterns/registry.json`.

| Task shape                | Default pattern              |
| ------------------------- | ---------------------------- |
| Cross-stack boundary work | `federated-dual-stack`       |
| CI / verify matrix        | `path-filtered-ci`           |
| Schema / WS parity        | `contract-first-integration` |
| Multi-agent thermo review | `bounded-parallel-agents`    |
| Harness structural change | `ecl-structured-change`      |

### 4. Run requirements-quality checklist

Set `$env:SPECIFY_FEATURE` then invoke:

```
/speckit-pattern-checklist <pattern-id>
```

Or `/speckit.checklist` with focus = `checklistDomain` from `patterns/coverage-map.json`.

Output: `specs/013-agent-workflow-gates/checklists/<domain>.md` (never overwrite — new file per run if domain differs).

### 5. Resolve gaps → tasks or ECL

For each unchecked item tagged `[Gap]`:

- Add discrete task to `tasks.md` with verify step, **or**
- Add acceptance bullet to active `harness/changes/active/*/CHANGE.md`

Do **not** start ECL implementation until checklist gaps are addressed or explicitly waived by user.

### 6. Pattern coverage verify

```powershell
node scripts/lib/run-pattern-gate.mjs --pattern <pattern-id>
```

Block session finish if verify fails. Optional wrapper:

```powershell
.\scripts\agent-session-finish.ps1 -PatternGate federated-dual-stack -VerifyStack ...
```

## Registry files

| File                         | Role                                               |
| ---------------------------- | -------------------------------------------------- |
| `patterns/registry.json`     | Pattern definitions (principle + source)           |
| `patterns/coverage-map.json` | Pattern → paths → `yarn` verify → checklist domain |

Drift guard: `node --test scripts/__tests__/pattern-coverage.test.mjs`

## Related

- Skill: [workflow-from-chats](../workflow-from-chats/SKILL.md)
- Command: [speckit-pattern-checklist](../../commands/speckit-pattern-checklist.md)
- Runbook: [thermo-nuclear-dual-monorepo-review](../../../docs/workflows/thermo-nuclear-dual-monorepo-review.md)
- Quickstart: [specs/013-agent-workflow-gates/quickstart.md](../../../specs/013-agent-workflow-gates/quickstart.md)
