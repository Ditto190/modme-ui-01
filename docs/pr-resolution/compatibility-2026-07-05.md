# Agent Compatibility Scan — 2026-07-05

P0 PR triage gate: merge allowed when score ≥ 60.

## Results

| Path | Score | Maturity | Gate |
|------|-------|----------|------|
| Repository root (`.`) | **90/100** | Agent-Ready | Pass |
| `next-forge/` | Not run (no forge-path delta in local #91 fixes) | — | N/A |
| `GenerativeUI_monorepo/` | Not run (no generative delta in local #91 fixes) | — | N/A |

## Root scan summary

- **baseScore:** 90
- **acceleratorBonus:** 3
- **overallScore:** 90

## Top fixes (root)

- Metrics, tracing, or error reporting — add operational signals for runnable services
- Validation command discoverable — expose repo-root lint/type command in docs
- Build or package command — clarify repo-root build entrypoint for agents
- One-command startup path — document primary dev command in README
- Cursor MCP setup — fix `.cursor/mcp.json` BOM parse warning

## Command

```bash
npx -y agent-compatibility@latest --json "."
```

Raw JSON available from scan run 2026-07-05.
