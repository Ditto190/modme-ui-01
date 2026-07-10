$ErrorActionPreference = "Continue"

$basePath = (Resolve-Path -Path $PSScriptRoot\..).Path
$diaryDir = Join-Path $basePath ".lean-ctx\memory\diary"
$sessionsDir = Join-Path $basePath ".lean-ctx\memory\sessions"

$files = @()
if (Test-Path $diaryDir) { $files += Get-ChildItem -Path $diaryDir -Filter "*.md" -Recurse }
if (Test-Path $sessionsDir) { $files += Get-ChildItem -Path $sessionsDir -Filter "*.md" -Recurse }

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed.StartsWith("{") -and $trimmed.EndsWith("}")) {
            try {
                $obj = ConvertFrom-Json $trimmed -ErrorAction Stop
                if ($null -ne $obj.confidence -and $obj.confidence -ge 0.9) {
                    if ($obj.type -eq "architecture" -or $trimmed -match "architectural decision") {
                        Write-Warning "High-confidence architectural decision found in $($file.Name). Promote to AGENTS.md."
                    }
                }
            } catch {
                # Silently ignore non-JSON or invalid JSON lines
            }
        }
    }
}

try {
    & lean-ctx ctx_knowledge consolidate
} catch {
    # Expected failure in current version
}
