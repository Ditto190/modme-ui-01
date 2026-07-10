# Handoff Report: Milestone 2 Implementation Strategy

## Observation
- `PROJECT.md` shows Milestone 2 (Knowledge/Memory Scaffold) is currently "PLANNED" and requires creating `.lean-ctx/memory/{knowledge,sessions,diary}` directories and implementing the script `scripts/lean-ctx-index.ps1`.
- `design.md` specifies the exact structure of the `memory` directories:
  - `knowledge/` for Project facts
  - `sessions/` for Session continuity
  - `diary/` for Agent diary
- `design.md` explicitly lists 4 required actions for `scripts/lean-ctx-index.ps1`:
  1. Aggregate JSON lines from `diary/*.md` and `sessions/*.md`.
  2. Extract "high-confidence" findings (`confidence >= 0.9`).
  3. Call `lean-ctx ctx_knowledge consolidate` to merge these into the `knowledge/` index.
  4. Provide an alert for new architectural decisions needing manual promotion to `AGENTS.md`.
- Executing `Test-Path .lean-ctx\memory` returned `False`, confirming the directory does not exist.
- Executing `Test-Path scripts\lean-ctx-index.ps1` returned `False`, confirming the script does not exist.

## Logic Chain
1. Since the `.lean-ctx/memory/` directories and the `scripts/lean-ctx-index.ps1` script do not currently exist, the worker must create them.
2. The `memory` directories must strictly follow the names defined in `design.md` (`knowledge`, `sessions`, `diary`) to fulfill the Milestone 2 objective.
3. The PowerShell script `scripts/lean-ctx-index.ps1` must contain logic to parse markdown files line-by-line in the `diary/` and `sessions/` directories, filtering for valid JSON lines.
4. The JSON objects must be parsed and filtered by the condition `$json.confidence -ge 0.9`.
5. For action 3, the script must invoke the external command `lean-ctx ctx_knowledge consolidate`.
6. For action 4, the script must check if `$json.type -eq "architecture"` (or similar `tags`) and output a manual `Write-Warning` or `Write-Host` alerting the user to update `AGENTS.md`.

## Caveats
- The exact input parameters for `lean-ctx ctx_knowledge consolidate` are not defined in `design.md`. The script will invoke it as a raw shell command without passing specific piped objects, assuming the command acts globally or consumes the extracted context by some other means (or we pipe the filtered JSON lines to it).
- Invalid JSON lines in the markdown files will need to be gracefully caught and ignored (using `try/catch` and `ConvertFrom-Json`).
- `lean-ctx ctx_knowledge consolidate` currently returns an error `unknown command 'ctx_knowledge'` when executed locally, indicating it may be a placeholder or require a specific plugin/environment flag not yet active. The script should still include it exactly as designed.

## Conclusion
The implementer agent must execute a two-step fix strategy:

1. **Scaffold the Directories:**
   Run the following commands:
   ```powershell
   New-Item -Path .lean-ctx/memory/knowledge -ItemType Directory -Force
   New-Item -Path .lean-ctx/memory/sessions -ItemType Directory -Force
   New-Item -Path .lean-ctx/memory/diary -ItemType Directory -Force
   ```

2. **Create `scripts/lean-ctx-index.ps1`:**
   Write the script with the following structure:
   ```powershell
   #!/usr/bin/env pwsh
   $baseDir = Join-Path $PSScriptRoot "..\.lean-ctx\memory"
   $diaryPath = Join-Path $baseDir "diary"
   $sessionsPath = Join-Path $baseDir "sessions"
   
   $highConfidence = @()
   $archDecisions = @()
   
   $files = @()
   if (Test-Path $diaryPath) { $files += Get-ChildItem -Path $diaryPath -Filter "*.md" -Recurse }
   if (Test-Path $sessionsPath) { $files += Get-ChildItem -Path $sessionsPath -Filter "*.md" -Recurse }
   
   # Action 1 & 2
   foreach ($f in $files) {
       $lines = Get-Content $f.FullName
       foreach ($line in $lines) {
           if ($line -match "^\s*\{.*\}\s*$") {
               try {
                   $obj = ConvertFrom-Json $line -ErrorAction Stop
                   if ($null -ne $obj.confidence -and $obj.confidence -ge 0.9) {
                       $highConfidence += $obj
                       if ($obj.type -eq "architecture" -or ($null -ne $obj.tags -and $obj.tags -contains "decision")) {
                           $archDecisions += $obj
                       }
                   }
               } catch { }
           }
       }
   }
   
   # Action 3
   Write-Host "Consolidating $($highConfidence.Count) findings..."
   $highConfidence | ConvertTo-Json -Depth 5 -Compress | lean-ctx ctx_knowledge consolidate
   
   # Action 4
   if ($archDecisions.Count -gt 0) {
       Write-Warning "ALERT: Found $($archDecisions.Count) new architectural decisions!"
       Write-Warning "Please manually promote these findings to AGENTS.md."
   }
   ```

## Verification Method
1. Verify the scaffolding by running `Test-Path .lean-ctx/memory/knowledge` (must return `True`).
2. Run `pwsh.exe -File scripts/lean-ctx-index.ps1`.
3. The script should run without terminating errors (even if `lean-ctx` throws a subcommand error, the PowerShell script itself should parse correctly and output the expected logs).
