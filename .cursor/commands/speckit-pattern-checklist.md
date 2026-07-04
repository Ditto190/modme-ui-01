---
description: Run speckit requirements-quality checklist for a ModMe architecture pattern ID
argument-hint: <pattern-id> e.g. federated-dual-stack
---

# Speckit Pattern Checklist

Runs `/speckit.checklist` scoped to a pattern from `specs/013-agent-workflow-gates/patterns/coverage-map.json`.

**Pattern argument:** `$ARGUMENTS` (default: `federated-dual-stack`)

## Setup

```powershell
$env:SPECIFY_FEATURE = "013-agent-workflow-gates"
```

## Agent instructions

1. Parse pattern ID from `$ARGUMENTS` (default `federated-dual-stack`).
2. Read `specs/013-agent-workflow-gates/patterns/coverage-map.json` for:
   - `checklistDomain` → output filename `checklists/<domain>.md`
   - `specSections` → focus areas for checklist items
   - `paths` → context for requirement traceability
3. Load `registry.json` entry for human-readable pattern title/principle.
4. Invoke **speckit.checklist** agent behavior with prompt:

```
Generate a requirements-quality checklist for domain: <checklistDomain>.
Pattern: <pattern-id> — <title>.
Focus spec sections: <specSections joined>.
Checklist tests REQUIREMENTS WRITING only (not implementation).
Target file: specs/013-agent-workflow-gates/checklists/<checklistDomain>.md
Minimum 15 CHK items; ≥80% with [Spec §...], [Gap], [Clarity], or [Completeness] tags.
Number CHK001+ sequentially.
```

5. Read `spec.md`, `plan.md`, `tasks.md` from feature dir before generating items.
6. Report path to created checklist and count of `[Gap]` items.

## Valid pattern IDs

- `federated-dual-stack`
- `path-filtered-ci`
- `contract-first-integration`
- `bounded-parallel-agents`
- `ecl-structured-change`

## Related

- Bridge skill: [`.cursor/skills/modme-workflow-speckit-bridge/SKILL.md`](../skills/modme-workflow-speckit-bridge/SKILL.md)
- Speckit agent: [`.github/agents/speckit.checklist.agent.md`](../../.github/agents/speckit.checklist.agent.md)
