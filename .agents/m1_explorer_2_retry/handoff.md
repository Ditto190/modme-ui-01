# Milestone 1 (Config Implementation) — Forensic Audit Fix Strategy

## 1. Observation
- `docs/lean-ctx-guide.md` (lines 228-229) specifies valid config keys for `~/.config/lean-ctx/config.toml` (which apply to `.lean-ctx.toml` locally): `compression_level`, `extra_ignore_patterns`, and shell allowlist.
- `.lean-ctx.toml` currently contains multiple keys not referenced in the canonical documentation: `graph_index_max_files`, `memory_profile`, `memory_cleanup`, and `multi_agent_sync = true`. These are hallucinated dummy values.
- `.cursor/hooks.json` configures hooks targeting `pwsh.exe -File scripts/lean-ctx-post-edit.ps1` and `scripts/lean-ctx-stop-marker.ps1`.
- A directory listing of `.cursor/hooks/` and the contents of `.cursor/hooks/README.md` confirms that the correct script paths are `.cursor/hooks/lean-ctx-post-edit.ps1` and `.cursor/hooks/lean-ctx-stop-marker.ps1`. The paths in `hooks.json` are thus invalid facades.
- `.cursor/rules/lean-ctx.mdc` contains correct and documented workflows (`ctx_session load`, `ctx_knowledge wakeup`, `ctx_agent diary`, etc.) with no hallucinated dummy configurations found.

## 2. Logic Chain
1. To address the **Hardcoded output / Dummy Value detection**, the `.lean-ctx.toml` file must be cleaned of all unsupported keys. Only `compression_level` and `extra_ignore_patterns` should remain.
2. To address the **Facade detection**, `.cursor/hooks.json` must be updated so the `command` strings point to the correct, existing script locations in the `.cursor/hooks/` directory, changing `scripts/` to `.cursor/hooks/`.
3. Making these two targeted fixes directly resolves the integrity violations flagged in the Forensic Audit Report.

## 3. Caveats
- I did not explore `~/.config/lean-ctx/config.toml` globally, as the audit specifically targets local project configuration files (`.lean-ctx.toml`, `.cursor/hooks.json`, `.cursor/rules/lean-ctx.mdc`).

## 4. Conclusion
The config files need to be explicitly patched to remove hallucinated parameters and fix the facade hook paths. The fix can be achieved by writing the following corrected files.

**Proposed fix for `.lean-ctx.toml`**:
```toml
# Maximize compression to reduce token bloat on shell commands and file reads
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
```

**Proposed fix for `.cursor/hooks.json`**:
```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "pwsh.exe -File .cursor/hooks/lean-ctx-post-edit.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ],
    "stop": [
      {
        "command": "pwsh.exe -File .cursor/hooks/lean-ctx-stop-marker.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ]
  }
}
```

## 5. Verification Method
1. Ensure the hallucinated dummy values are removed from `.lean-ctx.toml`: run `grep multi_agent_sync .lean-ctx.toml` and expect no output.
2. Verify the facade is resolved by testing the paths in `.cursor/hooks.json`: run `Test-Path .cursor/hooks/lean-ctx-post-edit.ps1` and expect `True`.
3. Re-run the forensic audit or ModMe preflight check to confirm zero integrity violations.
