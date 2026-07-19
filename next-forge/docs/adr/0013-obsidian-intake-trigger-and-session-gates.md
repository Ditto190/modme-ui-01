# ADR-0013: Obsidian Intake Trigger and Session Quality Gates

## Status

**Proposed**

Beads issue: `modme-7lo`.

## Context

Notes captured in the ModMe-Vault Obsidian sidecar land in `GenerativeUI_monorepo/docs/inbox/` through a directory junction (`docs/obsidian-sidecar-setup.md`). Today nothing reacts to those writes. A human must remember to run `yarn intake` or `yarn intake:orchestrate`, so captured notes sit unindexed and the Supabase knowledge store (`modme-next-forge`, ref `aevemmmmouxqlfyxthzf`) drifts behind the vault.

We want vault updates to trigger `scripts/intake-orchestrator.mjs` automatically, with quality gates at four phases (pre-session, during-session, pre-upsert, post-upsert), while staying inside existing repo invariants: the inbox contract v1 (ADR-0009), the dual-store intake architecture (ADR-0010), terminal orchestration without Nx (ADR-0011), the KM C4 ownership taxonomy (root `docs/adr/0014-km-c4-ownership-taxonomy.md`), and the router layering plan (root `docs/adr/0015-router-layering-km-polis-genui.md`).

## Decision Drivers

* Latency: a qualifying note should reach Supabase within one orchestrator run, not one human memory cycle.
* Idempotency: crashes and re-runs are normal for a file watcher on a developer workstation. Every stage must converge (poteto `principle-make-operations-idempotent`).
* Safety: no accidental Supabase writes. Live writes only after explicit opt-in; RLS, grants, and advisors per Supabase Postgres best practices.
* Simplicity: no new services, no message broker, no cloud spend. Obsidian and Node communicate via files only.

## Considered Options

### Option 1: PowerShell watcher + promotion predicate + existing orchestrator (chosen)

A `FileSystemWatcher`-based script (`scripts/obsidian-intake-trigger.ps1`) watches the inbox funnel directory. On a debounced change burst it evaluates a promotion predicate against the changed note's frontmatter and invokes `node scripts/intake-orchestrator.mjs --mode=session` (dry-run by default). All pipeline logic stays in the one orchestrator.

**Pros**: zero new runtime dependencies; reuses beads + telemetry hooks already wired into the orchestrator; watcher is ~150 lines; trivially disabled by killing one process.

**Cons**: workstation-bound (no trigger when the machine is off); PowerShell watcher needs its own stale-lock handling.

### Option 2: Trigger.dev / cloud scheduler

A hosted scheduler polls the repo or receives webhooks.

**Pros**: runs when the workstation is off.
**Cons**: cloud spend, secrets exposure, and the inbox funnel is a local junction — a cloud runner cannot see it without a sync layer. Rejected.

### Option 3: Obsidian plugin calling Node directly

**Pros**: richest event granularity.
**Cons**: violates the vault plugin policy (core-first allowlist, `docs/adam/Vault Plugin Policy.md`) and couples Obsidian to Node internals. The repo stance is Obsidian↔Node via CLI/file events only. Rejected.

### GraphQL read model (considered, deferred)

`pg_graphql` on the Supabase project could expose a thin read-model API over `inbox_entries` for ADAM dashboards. It is read-only, additive, and needs no code here, but nothing consumes it yet. Deferred until a dashboard actually needs it; recorded so the next agent does not re-litigate.

## Decision

Adopt **Option 1**: modular pipeline stages in the single orchestrator, fronted by a file-event watcher with a typed promotion predicate.

### Trigger predicate (promotion rule)

A changed note qualifies when, after Zod-parsing its frontmatter against `InboxFrontmatterSchema`:

```
pipeline_ready === true
  OR severity ∈ {high, critical}
  OR tags contains "intake/ready"
```

with a **content_hash debounce**: the watcher computes sha256 of the note body and skips runs whose triggering set of hashes matches the previous completed run (recorded in `logs/obsidian-intake-trigger/last-run.json`). Editing whitespace-only or re-saving without change never re-fires the pipeline.

The predicate lives in `next-forge/packages/schemas/intake-gates.ts` as a pure function over a discriminated-union gate model, exported next to the inbox contract it guards (poteto `principle-type-system-discipline`, `principle-boundary-discipline`: parse at the file boundary, trust types inside).

### Event lifecycle (Fable-5 naming)

| Event | Emitted when | Projections |
|---|---|---|
| `NoteCaptured` | File appears/changes in funnel | Vault file properties |
| `NoteQualified` | Promotion predicate passes | Watcher log + beads run (`beadsStartPipelineRun`) |
| `NoteTransformed` | `inbox-ingest` parses + normalizes | Telemetry `pipeline_run` step |
| `NoteUpserted` | Row upserted by `content_hash` into `inbox_entries` | Supabase row `status = indexed` |
| `NotePromoted` | `mda-categorize` + embeddings complete | Supabase row `status = categorized`; audit `--lens pipeline` green |

Events are not a new bus; they are named checkpoints that map onto the existing projections (vault props, beads run, telemetry `pipeline_run`, Supabase row status). No new infrastructure.

### Gate mapping

| Phase | Gate | Mechanism |
|---|---|---|
| Pre-session | env + workspace sane | `yarn lean-ctx:ensure`, `yarn worktree:doctor`, `yarn agent:session:start`, beads claim |
| During-session | funnel quality, telemetry open | `inbox-audit --lens funnel` (first orchestrator step), telemetry `pipeline_run` opened |
| Pre-upsert | contract + auth path | Zod strict parse against `InboxFunnelFileSchema` / `InboxEntryRecordSchema`; writes go through the service-role server path only (never a client key); RLS policies verified present before live mode |
| Post-upsert | convergence + schema health | `inbox-audit --lens pipeline`, Supabase MCP `get_advisors` (security + performance), `beadsFinishPipelineRun` |

### Supabase posture

* `inbox_entries` and any new exposed table: RLS enabled, policies `TO authenticated` with ownership predicates; UPDATE policies carry both `USING` (needs SELECT) and `WITH CHECK`. No `auth.role()`, no `user_metadata` in authz, no `service_role` in client code. Views over these tables use `security_invoker`.
* Indexes on `content_hash` (unique), `status`, `created_at`.
* Upsert-not-insert: `ON CONFLICT (content_hash) DO UPDATE` semantics so re-ingest converges.
* Schema changes only via `supabase migration new`; never `prisma db push --accept-data-loss` (repo rule; drops legacy tables).
* `get_advisors` runs after any schema touch and as the post-upsert gate.

### Idempotency per stage ("runs twice / crashed halfway" test)

| Stage | Runs twice | Crashed halfway | Convergence mechanism |
|---|---|---|---|
| Watcher fire | Second fire sees same trigger-hash set, skips | Stale PID lock detected (`last-run.json` + PID liveness check), lock reclaimed | content_hash debounce + PID-based stale lock |
| `inbox-audit` (reconciliation) | Read-only, always safe | Re-run re-derives report from disk | Pure function of funnel contents; runs at start of every orchestrator run |
| `inbox-fix --dry-run` | No writes | No writes | Dry-run only inside orchestrator |
| `inbox-ingest` | Upsert by `content_hash`, second run is a no-op update | Partially ingested batch: missing rows inserted, existing rows unchanged | DB unique index on `content_hash` + upsert |
| `inbox-embeddings` | Skips rows that already have vectors | Resumes at rows without vectors | Presence check on embedding column |
| `mda-categorize` | Re-categorization overwrites with same output for same input | Uncategorized rows picked up next run | Status-driven work selection (`status = indexed`) |
| `inbox-audit --lens pipeline` | Read-only | Read-only | Post-condition check, not a mutation |

If any stage's answer were "depends on what state was left behind," that stage would need a reconciliation step; the leading `inbox-audit` run is the reconciliation pass for the whole pipeline.

## Consequences

### Positive

* Vault capture to Supabase becomes hands-off for qualifying notes; low-severity scratch notes stay local until promoted.
* Gate phases give a single vocabulary for beads, telemetry, and audits.
* Typed predicate makes the promotion rule testable and exhaustively matched at compile time.

### Negative

* One more long-lived process on the workstation to babysit (mitigated by stale-lock self-healing and dry-run default).
* Frontmatter gains an optional `pipeline_ready` key not yet in contract v1; it is watcher-input-only until a contract v1.1 bump promotes it (tracked in the change tracker).

### Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Watcher fires during bulk vault sync | Medium | Debounce window + content_hash set comparison |
| Live upsert before RLS verified | High | `--dry-run` default; live mode requires explicit `-Live` flag and documented advisor pass |
| Junction breaks (vault moved) | Low | Watcher fails fast with a path-existence guard at startup |

## Implementation

* `scripts/obsidian-intake-trigger.ps1` — watcher, debounce, stale lock, predicate call, orchestrator invocation (dry-run default).
* `next-forge/packages/schemas/intake-gates.ts` — gate phases (discriminated union, exhaustive `never` switch), promotion predicate, trigger-set hash.
* `next-forge/packages/schemas/intake-gates.test.ts` — predicate truth table, hash idempotency, schema round-trip, double-run convergence.
* Docs: `C4-Documentation/c4-component-intake-pipeline.md` (expanded), `docs/tech-matrix.md`, `docs/technical-change-tracker.md`.

## Related Decisions

- **ADR-0009**: Constrains — inbox contract v1 schemas gate the pre-upsert phase.
- **ADR-0010**: Extends — event trigger feeds the dual-store intake's Supabase side.
- **ADR-0011**: Conforms — watcher is a plain script under root orchestration, no Nx.
- **Root ADR-0014** (`docs/adr/0014-km-c4-ownership-taxonomy.md`): C4 docs for this component follow the KM ownership taxonomy.
- **Root ADR-0015** (`docs/adr/0015-router-layering-km-polis-genui.md`): the deferred pg_graphql read model would slot into the KM router layer.

## References

- `scripts/intake-orchestrator.mjs`
- `next-forge/packages/schemas/inbox.ts`
- `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
- `docs/obsidian-sidecar-setup.md`
- Supabase advisors + RLS guidance: `.cursor/rules/sanjeed5-supabase.mdc`

---

**ADR Created**: 2026-07-12
**Last Updated**: 2026-07-12
**Status**: Proposed
