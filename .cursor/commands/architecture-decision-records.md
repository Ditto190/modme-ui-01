---
description: Create or update an Architecture Decision Record (ADR) in next-forge/docs/adr
argument-hint: [title or ADR number]
---

# Architecture Decision Records — ModMe

Create, review, or supersede ADRs for **significant** technical decisions.  
Index: [`next-forge/docs/adr/README.md`](../../next-forge/docs/adr/README.md)

Optional argument `$ARGUMENTS`: ADR title for a **new** record, or existing number (e.g. `0011`) to review/update status.

---

## When to write an ADR

| Write ADR | Skip ADR |
|-----------|----------|
| Framework / orchestration choice (e.g. Nx vs mprocs) | Bug fixes, minor patches |
| Cross-monorepo integration patterns | Routine config tweaks |
| Database / intake architecture | Implementation details |
| Multi-agent workflow conventions | One-off script changes |

---

## Location and numbering

- **Directory:** `next-forge/docs/adr/`
- **Filename:** `NNNN-short-title-with-dashes.md` (next sequential number)
- **Current latest:** check `ls next-forge/docs/adr/00*.md` — as of 2026-06-27, **0011** is agent terminal orchestration

After creating an ADR:

1. Update the index table in `next-forge/docs/adr/README.md`
2. Link related ADRs in both directions
3. If superseding, mark old ADR **Deprecated** or **Superseded by ADR-NNNN**

---

## Workflow

1. **Clarify** — What decision? What constraints? What options?
2. **Research** — Read related ADRs, `docs/codebase/ARCHITECTURE.md`, relevant plans in `.cursor/plans/`
3. **Draft** — Use MADR template below in `next-forge/docs/adr/NNNN-....md`
4. **Review** — Balanced pros/cons; no secrets; implementation section with real paths/commands
5. **Index** — Add row to `README.md`
6. **Optional beads** — `npx @beads/bd create "chore: ADR-NNNN — <title>"` if tracking spans sessions

If `$ARGUMENTS` is empty, ask the user for the decision topic before drafting.

---

## MADR template (copy into new file)

```markdown
# ADR-NNNN: <Title>

**Status**: Accepted  
**Date**: YYYY-MM-DD  
**Supersedes**: N/A | ADR-XXXX

## Context

[Problem, constraints, drivers. Why now?]

## Decision Drivers

* Driver 1
* Driver 2

## Considered Options

### Option 1: <name>
**Pros**: …  
**Cons**: …

### Option 2: <name>
**Pros**: …  
**Cons**: …

## Decision

We will **[chosen option]** because …

## Rationale

[Why this beats alternatives]

## Consequences

### Positive
- …

### Negative
- …

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| … | … |

## Implementation

[Paths, scripts, commands, config]

## Related Decisions

- **ADR-XXXX**: …

## References

- [Internal doc or plan]
```

---

## ModMe-specific guidance

- **Root vs next-forge:** Repo-wide decisions (worktrees, orchestration, dual monorepo) still live in `next-forge/docs/adr/` as the canonical ADR store; cross-link from `docs/` guides when needed.
- **Supersession:** Cloud Supabase is ADR-0002 (supersedes 0001). Inbox contract is 0009. Dual-store intake is 0010. Terminal orchestration without Nx is **0011**.
- **Do not edit accepted ADRs in place** for material changes — write a new ADR that supersedes.
- **No secrets** in ADRs (no API keys, connection strings, tokens).

---

## Output format

After running, respond with:

1. **Decision summary** — one paragraph
2. **ADR path** — `next-forge/docs/adr/NNNN-....md`
3. **Status** — Proposed | Accepted
4. **Index updated** — yes/no
5. **Follow-ups** — beads issue, CHANGELOG, AGENTS.md (only if commands/layout changed)

If the user only wanted review of an existing ADR, summarize status and gaps — do not create a duplicate file.
