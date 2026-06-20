# Eval Pipeline — Parallel Agent Orchestration

Co-created by **database-architect**, **se-system-architecture-reviewer**, **advanced-evaluation**, **acceptance-orchestrator**, **agent-workbench-orchestration**, and **awesome-cursor-skills** patterns.

## Agent roles

| Agent / skill | Responsibility in eval pipeline |
|---------------|----------------------------------|
| **database-architect** | `eval_*` tables, indexes, RLS; mirror `intake_events` pattern; popularity FK to catalogue |
| **se-system-architecture-reviewer** | Bounded context: collect → normalize → score → report; fail-closed; local-first |
| **advanced-evaluation** | Objective = direct contract pass/fail; subjective = pairwise only in Phase 5+ LLM judge; position-swap if used |
| **acceptance-orchestrator** | State machine below; no "done" without evidence per goal-contract |
| **agent-workbench-orchestration** | Workbench verify phase: WS latency + visual-qa after agent-server changes |
| **awesome-cursor-skills** | Phase 3 verify: `finding-dev-server-url` → `verifying-in-browser` → `grinding-until-pass` |
| **parallel-agents** | Synthesis table at end of each eval run |

## awesome-copilot patterns mapped

### Canvas extensions → ModMe eval surfaces

| Upstream | Mechanism | ModMe equivalent |
|----------|-----------|------------------|
| **feedback-themes** | `themes.json` + signals → `computeThemeGroups()` → impact sort → `/api/state` + canvas `get_state` / `explore_theme` | `docs/evaluation/contracts/themes.json` + `agent-eval-collect.mjs` → `yarn eval:report` themes section |
| **gesture-review** | SSE + human approve/reject on PR queue | Future: log PR review decisions as `eval_signals` source=`human-gesture` |
| **where-was-i** | `gatherContext()` git/gh bundle → persist → resume canvas | `agent-eval-collect.mjs` → `reports/agent-eval/resume.json` on orphan sessions |

### ACReadiness → ModMe eval reports

| Upstream | Loop | ModMe equivalent |
|----------|------|------------------|
| **acquire-codebase-knowledge** | Evidence-only 7-doc contract | Eval claims traceable to log paths + transcript IDs |
| **acreadiness-generate-instructions** | Generate after measure | After low eval pillar → suggest AGENTS.md / instruction updates |
| **ai-readiness-reporter** | AgentRC JSON → `reports/index.html` + `#raw-data` | `agent-eval-report.mjs` → `reports/agent-eval/index.html` |

### eng/ contributor tooling

awesome-copilot `eng/` is build/marketplace focused — ModMe analogue is **catalogue index + eval cron**, not contributor reports. Reuse **on-demand script** pattern only: eval scripts run locally/CI, not on every push.

## Acceptance-orchestrator state machine

```
intake → issue-gated → executing → review-loop → deploy-verify → accepted | escalated
```

Applied to eval pipeline runs:

| State | Entry | Exit evidence |
|-------|-------|---------------|
| **intake** | `yarn eval:collect` invoked | goal-contract.yaml criteria loaded |
| **issue-gated** | Contracts + themes files present | All required paths exist |
| **executing** | Collect + normalize JSONL | `eval-events.jsonl` written |
| **review-loop** | Contract replay + theme grouping | `behavioral.contracts[]` in report JSON |
| **deploy-verify** | HTML report + optional Supabase upsert | `reports/agent-eval/index.html` + `#raw-data` |
| **accepted** | Every acceptance criterion has evidence | See goal-contract.template.yaml |
| **escalated** | Missing logs, contract critical fail, 2 rounds failed | Human decision required |

**Human gates:** prod Supabase writes, destructive git, changing contract severity thresholds.

## Workbench orchestration (when eval touches agent-server)

If eval run includes GenerativeUI workbench changes, run **agent-workbench-orchestration** Phase 3 after eval collect:

```
Phase 0  goal-contract.yaml
Phase 1  BE ∥ FE (only if eval hooks touch WS)
Phase 2  Schema alignment (eval event contract in shared-schemas)
Phase 3  finding-dev-server-url → verifying-in-browser → visual-qa-testing → grinding-until-pass
Phase 4  code-reviewer (no P0/P1)
```

Handoff JSON (required from subagents):

```json
{
  "agent": "eval-collect",
  "status": "complete",
  "artifacts": ["logs/eval/eval-events.jsonl"],
  "contract_delta": {},
  "verification": ["yarn eval:collect --dry-run", "yarn eval:report:dry-run"],
  "blockers": []
}
```

## advanced-evaluation decision tree (this pipeline)

```
Objective ground truth? (contract pass/fail, exit code, log timestamp)
  YES → Direct scoring (binary pass/fail per rule)
  NO  → Preference / quality judgment?
          YES → Pairwise (Phase 5+, position swap required)
          NO  → Reference-based (transcript vs expected tool sequence)
```

**Phase 2–4:** no LLM-as-judge — replay only. **Phase 5:** optional PoLL for rubric scoring of session summaries.

## Parallel synthesis template

After each eval run, emit:

```markdown
## Eval orchestration synthesis

### Task summary
[collect window, session count, theme count]

### Agent contributions
| Lane | Finding |
|------|---------|
| database-architect | Schema 006 ready / skipped (no Supabase) |
| acceptance-orchestrator | 4/6 criteria accepted |
| advanced-evaluation | 2 critical contract violations |

### Consolidated recommendations
1. **Critical**: [contract id]
2. **Important**: [top theme by impact]

### Action items
- [ ] Fix worktree-discipline signals
- [ ] Run intake:dry-run before next session-end
```

## Commands

```powershell
yarn eval:collect              # normalize logs → logs/eval/eval-events.jsonl
yarn eval:collect --dry-run
yarn eval:report               # JSON report + themes + contracts
yarn eval:report --output=reports/agent-eval/index.html
```

## Related

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — data flow + schema overview
- [`goal-contract.template.yaml`](goal-contract.template.yaml) — DoD checklist
- [`contracts/`](contracts/) — themes + behavioral YAML
- Upstream: `.vendor/awesome-copilot-main/extensions/`, `skills/acreadiness-*`
