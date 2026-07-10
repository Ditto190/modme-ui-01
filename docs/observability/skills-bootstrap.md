# Observability Skills Bootstrap

Install awesome-agent-skills for the ModMe distributed observability stack via `npx skills add` + skills-sh MCP.

## Required skills

| Skill | Role | Install |
|-------|------|---------|
| `distributed-debugging-debug-trace` | Trace boundaries, OTel span debugging, distributed context propagation | `npx skills add distributed-debugging-debug-trace` |
| `observability-engineer` | SLOs, runbooks, alert design, Greptime metrics | `npx skills add observability-engineer` |
| `observability-monitoring-monitor-setup` | Dashboard/metrics checklist, Prometheus patterns | `npx skills add observability-monitoring-monitor-setup` |
| `data-quality-frameworks` | Expectations contracts, Zod validation gates, CI quality checks | `npx skills add data-quality-frameworks` |
| `context7-auto-research` | Live docs for OTel/Greptime/Supabase/Prisma/VoltAgent | `npx skills add context7-auto-research` |
| `error-debugging-error-trace` | Incident drill-down, error correlation across agent spans | `npx skills add error-debugging-error-trace` |

## Bulk install

```powershell
# From repo root (skills-sh MCP must be available)
npx skills add distributed-debugging-debug-trace
npx skills add observability-engineer
npx skills add observability-monitoring-monitor-setup
npx skills add data-quality-frameworks
npx skills add context7-auto-research
npx skills add error-debugging-error-trace
```

Or via skills-sh MCP tool `install_skill` in one session:

```json
[
  "distributed-debugging-debug-trace",
  "observability-engineer",
  "observability-monitoring-monitor-setup",
  "data-quality-frameworks",
  "context7-auto-research",
  "error-debugging-error-trace"
]
```

## Verification

After install, confirm skills are resolvable:

```powershell
# Check each skill path exists
Get-ChildItem "$HOME\.agents\skills\distributed-debugging-debug-trace\SKILL.md"
Get-ChildItem "$HOME\.agents\skills\observability-engineer\SKILL.md"
Get-ChildItem "$HOME\.agents\skills\data-quality-frameworks\SKILL.md"
Get-ChildItem "$HOME\.agents\skills\context7-auto-research\SKILL.md"
```

## Orchestrator

Once these are installed, use the composed orchestrator skill at:

`.agents/skills/modme-distributed-observability/SKILL.md`

This skill composes all of the above plus `observability-pipeline`, `lean-ctx`, `supabase`, and `awesome-agent-skills`.

## context7 MCP

The `context7-auto-research` skill requires context7 MCP to be configured in `.cursor/mcp.json` (already done).

Use it to validate OTel headers, Supabase RLS patterns, and Greptime OTLP config before schema changes.

## Related

- [`docs/observability/README.md`](./README.md) — entry point
- [`.cursor/skills/observability-pipeline/SKILL.md`](../../.cursor/skills/observability-pipeline/SKILL.md) — base pipeline skill
- [`.agents/skills/modme-distributed-observability/SKILL.md`](../../.agents/skills/modme-distributed-observability/SKILL.md) — orchestrator
