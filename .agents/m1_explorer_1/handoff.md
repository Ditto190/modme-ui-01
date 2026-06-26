# Milestone 1: Config Implementation Handoff

## 1. Observation
I reviewed the project specification (`PROJECT.md`) and the design document (`.agents/explorer_1/design.md`). I also inspected the current state of three configuration files:
- `.lean-ctx.toml`: Contains base configuration but lacks the updated values for monorepo scale and multi-agent sync (currently `memory_profile = "balanced"`, `graph_index_max_files = 12000`, missing compression settings).
- `.cursor/hooks.json`: Exists as a minimal JSON (`{"version": 1, "hooks": {}}`) without the defined `afterFileEdit` or `stop` hook implementations.
- `.cursor/rules/lean-ctx.mdc`: Contains hybrid mode tool mapping but is missing the required additions for multi-agent workflows, session loading, and knowledge persistence.

## 2. Logic Chain
Based on `design.md` section R1, the configuration must be aligned to support monorepo scale and multi-agent workflows. 
1. **`.lean-ctx.toml`** requires adding compression, tuning the memory profile to `adaptive`, increasing the max files to `15000`, enabling cross-worktree sync, and explicitly ignoring agent diaries to prevent token bloat.
2. **`.cursor/hooks.json`** requires the addition of command hooks for both `afterFileEdit` (`scripts/lean-ctx-post-edit.ps1`) and `stop` (`scripts/lean-ctx-stop-marker.ps1`) with a 5-second timeout to adhere to the safe advisory pattern.
3. **`.cursor/rules/lean-ctx.mdc`** needs explicit directives to ensure agents use `ctx_session load` and `ctx_knowledge wakeup` at the start, use `ctx_agent diary` and `ctx_agent register` for multi-agent handoffs, and persist high-confidence facts to `AGENTS.md`.

## 3. Caveats
- Hook scripts (`scripts/lean-ctx-post-edit.ps1` and `scripts/lean-ctx-stop-marker.ps1`) will be created/validated in a later milestone or must be present for the hooks to execute properly, though configuring `hooks.json` is safe as the timeout avoids blocking failures.
- No `compression_level` property was present in the original `.lean-ctx.toml`, so it needs to be added at the root level.
- Ensure `.lean-ctx.toml` is written in valid TOML and `hooks.json` is formatted properly.

## 4. Conclusion
The implementation of Milestone 1 is straightforward and consists of direct configuration updates to three target files. An implementer agent should execute the step-by-step fix strategy below.

### Step-by-Step Fix Strategy for Implementer:

**Step 1: Update `.lean-ctx.toml`**
Add or update the following values:
```toml
compression_level = "max"

extra_ignore_patterns = [
  "node_modules/**",
  "dist/**",
  ".next/**",
  "coverage/**",
  "target/**",
  "vendor/**",
  "generated/**",
  "UniversalWorkbench-staging/**",
  "UniversalWorkbench-dev/**",
  ".lean-ctx/memory/diary/**"
]

graph_index_max_files = 15000
memory_profile = "adaptive"
memory_cleanup = "shared"
multi_agent_sync = true
```

**Step 2: Update `.cursor/hooks.json`**
Overwrite the file content to match:
```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "pwsh.exe -File scripts/lean-ctx-post-edit.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ],
    "stop": [
      {
        "command": "pwsh.exe -File scripts/lean-ctx-stop-marker.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ]
  }
}
```

**Step 3: Update `.cursor/rules/lean-ctx.mdc`**
Append the following section to the end of the MDC file:
```markdown
## Multi-Agent Workflows & Memory
- Start of task: Enforce `ctx_session load` + `ctx_knowledge wakeup`.
- Handoffs: Enforce `ctx_agent diary` and `ctx_agent register` for multi-agent handoffs, explicitly separating project facts from session diaries.
- Persistence: High-confidence facts learned via `ctx_knowledge` MUST also be persisted in `AGENTS.md`.
```

## 5. Verification Method
1. Inspect `.lean-ctx.toml` to verify `compression_level`, `multi_agent_sync`, and the updated `extra_ignore_patterns` exist.
2. Inspect `.cursor/hooks.json` to verify valid JSON containing the `afterFileEdit` and `stop` scripts.
3. Inspect `.cursor/rules/lean-ctx.mdc` to verify the multi-agent and memory directives are present.
