# C4 Component — agenttrace observability

## Responsibility

Session cost/performance monitoring; anomaly detection for agent runs.

## Location

- CLI: `yarn agenttrace`, `.tools/agenttrace.exe`
- CI: `.github/workflows/agenttrace-ci.yml`
- Bridge target: ECL session envelopes (advanced profile — no Go harness/trace)

## Evidence

- `AGENTS.md` Observability section
- `docs/agent-terminal-orchestration.md`
