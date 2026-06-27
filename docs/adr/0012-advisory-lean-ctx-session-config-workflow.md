# ADR-0012: Advisory lean-ctx Session Config Workflow

## Status

**Accepted**

## Context

ModMe agents frequently bypass lean-ctx MCP tools (`ctx_read`, `ctx_search`, `ctx_shell`) despite
`alwaysApply` rules in `.cursor/rules/lean-ctx.mdc`. Additional gaps:

- Active global config lives at **XDG** `~/.config/lean-ctx/config.toml`, not legacy `~/.lean-ctx/`
- `config-schema.json` is a CLI snapshot reference, not read at runtime
- Repo hooks are **disabled** (`.cursor/hooks.json` empty) for reliability — automation must be advisory
- `scripts/setup-lean-ctx.ps1` was minimal and did not merge ModMe hybrid presets or detect bypass

Session finish (`vibe-session-finish.ps1`, smart-git-automation) had no pre-flight for lean-ctx health.

## Decision Drivers

- **Token economics**: hybrid lean-ctx reduces context cost without blocking native tools
- **Safe defaults**: missing/invalid config should self-heal without overwriting user customizations
- **Non-blocking**: no `failClosed` PreToolUse hooks (repo policy)
- **Session-aware nudge**: remind once per session when configured but unused
- **DX**: single entry `yarn lean-ctx:ensure` wired into smart-git Step 0

## Considered Options

### Option 1: Blocking PreToolUse hooks

Redirect native Read/Grep/Shell to lean-ctx at hook time.

**Pros**: Strong enforcement.

**Cons**: Violates repo hook policy; caused focus/reliability issues; fights IDE tooling.

### Option 2: Manual docs only

Document config paths in `AGENTS.md` without automation.

**Pros**: Zero maintenance.

**Cons**: Agents still skip; config drift undetected; no schema sync.

### Option 3: Advisory script + skill Step 0 (selected)

`ensure-lean-ctx-config.ps1` detects, auto-applies safe defaults, nudges adoption; smart-git Step 0 runs before git grouping.

**Pros**: Aligns with disabled hooks; idempotent; merge-not-clobber presets; optional `-CheckOnly` in session finish.

**Cons**: Relies on agents/skills firing; not 100% enforcement.

## Decision

Adopt **Option 3**: advisory lean-ctx session config workflow integrated into smart-git-automation as **Step 0**, implemented by `scripts/ensure-lean-ctx-config.ps1` and `yarn lean-ctx:ensure`.

## Rationale

Matches questionnaire outcome (auto-apply safe defaults, confirm only for destructive overwrites). Keeps human/agent control while closing the config gap that made rules ineffective.

## Consequences

### Positive

- One-command detect/apply: `yarn lean-ctx:ensure`
- Schema snapshot at `docs/lean-ctx/config-schema.json` with `yarn lean-ctx:schema:sync`
- Scoped MDC rule (`.cursor/rules/lean-ctx-config.mdc`) when editing config artifacts
- Session finish pre-flight (`-CheckOnly` default; `-ApplyLeanCtx` opt-in)
- Once-per-session adoption checklist via `.cursor/hooks/state/lean-ctx-adopted-{session}.json`

### Negative

- Agents may still ignore Step 0 if skill not loaded
- Windows PowerShell-only ensure script (yarn wraps it)
- Legacy `~/.lean-ctx/` may confuse until users migrate

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overwrite user TOML | Medium | Merge-only preset keys; `-Force` required to clobber; `.bak` before writes |
| False "unused" nudge | Low | Session marker file; heuristics advisory only |
| Schema drift | Low | `lean-ctx:schema:sync` in ensure + CI docs |

## Implementation

| Artifact | Role |
|----------|------|
| `scripts/ensure-lean-ctx-config.ps1` | Detect, apply, nudge |
| `.agents/skills/smart-git-automation/` | Step 0 + reference workflow |
| `package.json` | `lean-ctx:ensure`, `:ensure:check`, `:doctor`, `:schema:sync` |
| `docs/lean-ctx-guide.md` | Operator docs |
| `.cursor/hooks.json.example` | Optional opt-in `sessionStart` (5s, non-blocking) |

ModMe preset keys (set only if missing): `compression_level=max`, `memory_profile=balanced`, `tool_profile=power`, `proxy_enabled=true`, `max_ram_percent=5`; project `.lean-ctx.toml` with `graph_index_max_files=15000`.

## Related Decisions

- **ADR-0009**: Inbox quality gates — separate pipeline; lean-ctx ensure runs at session/git boundary, not ingest
- **Root `AGENTS.md`**: Documents `yarn lean-ctx:ensure` and XDG paths

## References

- [lean-ctx configuration](https://leanctx.com/docs/configuration/)
- [`docs/lean-ctx-guide.md`](../lean-ctx-guide.md)
- [`.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md`](../../.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md)

---

**ADR Created**: 2026-06-27  
**Deciders**: cursor agent (lean-ctx-setup worktree)  
**Beads**: `modme` issue tracking — link at commit via `bd create` when CLI available
