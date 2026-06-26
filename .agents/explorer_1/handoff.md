# Handoff Report: Lean-CTX Configuration Design

## 1. Observation
- `call_mcp_tool` is missing from the toolset and CODE_ONLY mode prevented direct web access. The main agent provided guidance to use local documentation `docs/lean-ctx-guide.md` and local configuration files.
- Read `docs/lean-ctx-guide.md`: Identifies a "Three-layer memory model" (`ctx_knowledge`, `ctx_session`, `ctx_agent`), recommends `.lean-ctx/memory/` structure, and specifies rules for hooks and `.lean-ctx.toml` config parameters.
- Read `.lean-ctx.toml`: Currently set with `graph_index_max_files = 12000`, `memory_profile = "balanced"`, and `memory_cleanup = "shared"`.
- Read `.cursor/rules/lean-ctx.mdc`: Exists with hybrid mode rules for tools but lacks explicit guidelines for `ctx_agent` diary sharing in multi-agent workflows.
- Evaluated `.cursor/hooks.json` (currently empty `{}`) and `.github/hooks/hooks.json` (configured with lean-ctx pre/post hooks).
- Verified absence of `.lean-ctx/memory/` directory and `scripts/benchmark-lean-ctx.ps1`.

## 2. Logic Chain
- **R1. Configuration**: To support the monorepo and multi-agent workflows, `.lean-ctx.toml` needs `compression_level = "max"`, `memory_profile = "adaptive"`, and `multi_agent_sync = true`. The `.cursor/hooks.json` should safely employ the `stop` and `afterFileEdit` hooks as advised by `docs/lean-ctx-guide.md`, without `failClosed`. `lean-ctx.mdc` should be updated to remind agents about the `ctx_agent` multi-agent diary workflow.
- **R2. Memory Base**: A structured knowledge base directory (`.lean-ctx/memory/knowledge`, `sessions`, `diary`) will map to the Three-layer memory model. An indexing script `lean-ctx-index.ps1` is required to parse diary JSON records and consolidate findings into permanent agent knowledge.
- **R3. Benchmarking**: A script `benchmark-lean-ctx.ps1` that measures the stopwatch time for shell wrappers (`lean-ctx -c "git status"`) and context loads (`ctx_session load`), then displays token metrics (`lean-ctx gain`), fulfills the requirement for validating context load times.

## 3. Caveats
- Since the exact content of GitHub Context7 docs was not accessible natively, the local `lean-ctx-guide.md` served as the source of truth.
- Creating the actual `.ps1` scripts and modifying the configuration files directly was outside the scope of this read-only exploration task.
- The `benchmark-lean-ctx.ps1` is a proposed design and must be thoroughly tested for execution context on the target machines.

## 4. Conclusion
The comprehensive configuration design for `lean-ctx` in the ModMe monorepo has been generated and saved to `.agents/explorer_1/design.md`. The proposed design addresses R1, R2, and R3, implementing the "Three-layer memory model" and safely integrating Cursor hooks for adaptive learning and performance tuning. The implementation phase can now commence using this blueprint.

## 5. Verification Method
- **Implementation check**: Validate the creation of `.lean-ctx.toml` edits, the `.lean-ctx/memory/` scaffolding, and the PowerShell scripts.
- **Benchmark run**: Execute `pwsh.exe -File scripts/benchmark-lean-ctx.ps1` and assert that the timing metrics are outputted (e.g., Context session load time < 500ms).
- **Hooks validation**: Create a temporary file edit to trigger `afterFileEdit` hook and verify it functions non-blockingly.
