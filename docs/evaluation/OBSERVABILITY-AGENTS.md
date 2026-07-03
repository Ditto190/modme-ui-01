# Observability Parallel Agent Orchestration

Co-created for **Observability Round 2** — DSP subgraph orientation, data-quality audit gates, and the `modme-observability` skill collection.

## Role → skill mapping

| Parallel agent role | Primary skills / agents | Install |
|---------------------|-------------------------|---------|
| **orchestrator** | `memory-merger`, `parallel-agents` (global) | Collection + `npx skills add` |
| **explorer-agent** | `acquire-codebase-knowledge`, `data-structure-protocol` (global) | Collection + DSP `read-toc` |
| **backend-specialist** | `gem-devops`, project `observability-pipeline` | Collection + `.cursor/skills/observability-pipeline/` |
| **frontend-specialist** | Session Ops / OpsSignalCard patterns | `docs/evaluation/ARCHITECTURE.md` UI section |
| **test-engineer** | `quality-playbook`, `doublecheck` | Collection |
| **devops-engineer** | `github-actions-efficiency`, `phoenix-tracing`, `appinsights-instrumentation` | Collection |
| **database-architect** | `api-architect`, `postgresql-code-review` | Collection |
| **documentation-writer** | `create-agentsmd`, `ai-readiness-reporter`, `context7-auto-research` (global) | Collection + `npx skills add` |
| **debugger** | `dynatrace-expert`, `comet-opik`, `se-security-reviewer` | Collection |

```powershell
node scripts/install-agents.mjs -c scripts/collections/modme-observability.collection.json
npx skills add obra/superpowers@parallel-agents --agent cursor -y   # example global skill
```

Project-only skill (not vendor-installable): [`.cursor/skills/observability-pipeline/SKILL.md`](../../.cursor/skills/observability-pipeline/SKILL.md)

## Sequential orchestration chain

Run lanes in order; parallelize only where noted.

1. **explorer-agent** — `python scripts/dsp-cli.py --root . read-toc` and `search telemetry`; confirm subgraph in `.dsp/`
2. **database-architect** — verify [`009_observability_tenant.sql`](../next-forge/supabase/migrations/009_observability_tenant.sql) + Prisma models + RLS
3. **backend-specialist** — review [`telemetry-bridge.mjs`](../scripts/telemetry/lib/telemetry-bridge.mjs) + API ingest route contract alignment
4. **frontend-specialist** — Session Ops panel + OpsSignalCard props vs Zod schemas
5. **test-engineer** — `yarn telemetry:test` + `yarn telemetry:audit --lens all`
6. **devops-engineer** — [`.github/workflows/observability-pipeline-check.yml`](../.github/workflows/observability-pipeline-check.yml) + Greptime env checklist
7. **Synthesis** — emit markdown report (template below)

## Data quality gates

Expectations: [`docs/inbox-pipeline/contracts/expectations/observability.v1.json`](../inbox-pipeline/contracts/expectations/observability.v1.json)

```powershell
yarn telemetry:audit --lens contracts   # offline — no Supabase required
yarn telemetry:audit --lens sync        # runs telemetry-cli sync --dry-run
yarn telemetry:audit --lens pipeline    # skips gracefully without Supabase env
yarn telemetry:audit --lens all
```

Report: [`docs/inbox-pipeline/reports/observability-latest.md`](../inbox-pipeline/reports/observability-latest.md)

## DSP orientation

```powershell
yarn dsp:observability:stats
python scripts/dsp-cli.py --root . search telemetry
python scripts/dsp-cli.py --root . get-recipients <uid>
```

Bootstrap (once): `node scripts/bootstrap-dsp-observability.mjs`

## Parallel synthesis template

After each observability maintenance run, emit:

```markdown
## Observability orchestration synthesis

### Task summary
[scope: contracts | bridge | UI | CI; pipeline_run_id if any]

### Agent contributions
| Lane | Finding |
|------|---------|
| explorer-agent | DSP subgraph N entities, no cycles |
| database-architect | Migration 009 / RLS status |
| backend-specialist | Bridge or API contract delta |
| frontend-specialist | OpsSignalCard / Session Ops gap |
| test-engineer | telemetry:test + telemetry:audit result |
| devops-engineer | CI workflow / Greptime env status |

### Consolidated recommendations
1. **Critical**: [OBS.* code or contract id]
2. **Important**: [top theme or lens warning]

### Action items
- [ ] `yarn telemetry:audit --lens all`
- [ ] `yarn telemetry:sync` (after `bun run db:push` if Session Ops empty)
- [ ] Update golden fixture if enums changed
```

## Related

- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Eval orchestration: [`ORCHESTRATION.md`](ORCHESTRATION.md)
- Collection: [`scripts/collections/modme-observability.collection.json`](../../scripts/collections/modme-observability.collection.json)
- Distributed orchestrator: [`.agents/skills/modme-distributed-observability/SKILL.md`](../../.agents/skills/modme-distributed-observability/SKILL.md)
- Round 2 plan: `.cursor/plans/observability_round_2_7efe0a10.plan.md` (read-only reference)
