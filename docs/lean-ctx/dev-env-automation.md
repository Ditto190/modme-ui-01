# Dev environment automation

This document describes the startup health-check that wires the ModMe onboarding steps, lean-ctx rules, tmux harness, and ShellCheck validation under a cohesive multi-agent supervisor pattern.

## What the health-check does

1. **Supervisor/autopilot:** `scripts/dev-env-health.ps1` runs on every Cursor session start via `.cursor/hooks.json.example`. It executes `yarn lean-ctx:ensure`, `yarn setup:modme` (when needed), `yarn worktree:doctor`, `yarn session:verify`, and `yarn test:shell`, mirroring the onboarding steps described in `.agents/skills/modme-dev-setup/SKILL.md`.
2. **Fallback/rescue:** If any proof-of-life step fails, the script reruns `setup:modme` plus lean-ctx/worktree doctors to recover, then replays the health-check to ensure the loop converges—this mirrors the supervisor/orchestrator pattern from the multi-agent architecture guidelines.
3. **Shell linting:** The script invokes `shellcheck` across the repository shell scripts using `.shellcheckrc`; missing binaries surface as warnings, and results feed into the health log.
4. **TMUX agent harness:** `scripts/agent-tmux-harness.ps1` ensures there is always a `tmux` session named `modme-agent-harness` with windows for general commands, lean-ctx tee logs, and session markers. The harness maps to the “agent harness” idea mentioned in the multi-agent patterns skill: `tmux` becomes a lightweight supervision layer for tooling and observability.
5. **Lean-ctx instrumentation:** health output writes to the standard lean-ctx logging paths so `lean-ctx` (CEP/CCP/A2A stack) can capture the startup story. The tmux logs let the supervisor pattern share context with multiple terminal panes.

## How this links to multi-agent patterns

- **Supervisor/Orchestrator:** The health-check is a coordinator that runs lean-ctx, beads, and tmux plumbing in sequence; the tmux harness windows act as specialized sub-agents (logs, markers) that emit signals back into the supervisor channel.
- **Context isolation:** Each tmux pane focuses on a single trace (shell, lean-ctx tee, markers) so agents do not carry extra history; we keep log commands tailing a single file, matching the isolation principle.
- **Coordination safety:** When the health-check or shellcheck hits issues, it reruns the recovery path before declaring success, preventing divergence or cascade failures (a simple consensus guard).

## Observability and hooks

- The `dev-env-health` script runs from `.cursor/hooks.json.example` `sessionStart`, so every Cursor session automatically triggers the onboarding verification. The final output says “Dev environment health check passed.”
- The script writes warnings and errors to the console so the session marker and telemetry collectors (`telemetry/telemetry-cli.mjs`) ingest them afterward.
- TMUX harness windows can be attached manually via `tmux attach -t modme-agent-harness` for interactive debugging. The harness is designed to survive multi-agent sessions by staying idempotent: it only creates the tmux session once per machine.

## ShellCheck configuration

- `.shellcheckrc` lives in the repo root. It targets Bash (`shell=bash`), enables all checks, and silences the known noise (`SC1091`, `SC2115`, `SC2181`). Running `shellcheck` from `dev-env-health` respects this configuration, preventing false positives.

## Next steps

- If you want additional automation, run `yarn dev-env:health` manually or adjust `.cursor/hooks.json.example` to point at a different script.
- Keep the tmux harness up to date by editing `scripts/agent-tmux-harness.ps1`; new windows can be added following the same multi-agent pattern (each pane provides a focused observation channel).
