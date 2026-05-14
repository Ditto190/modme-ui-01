# Archive Observability Documentation
# Phase 1: Move temporal docs to archive
# Date: 2026-02-08

$ErrorActionPreference = "Stop"
$docsDir = "D:\Github_Projects\Modme_2026\modme-ui-01-test-worktree\docs"

# Archive Phoenix temporal docs
Write-Host "`n=== Archiving Phoenix Temporal Docs ===" -ForegroundColor Cyan
$phoenixArchive = "$docsDir\archive\observability\2026-02-phoenix"
$phoenixFiles = @(
    "PHOENIX_QUICK_TEST.md",
    "PHOENIX_INTEGRATION_SOLUTION.md",
    "PHOENIX_IMPLEMENTATION_SUMMARY.md",
    "PHOENIX_PROVIDER_INTEGRATION_SUMMARY.md",
    "PHOENIX_SETUP_COMPLETE.md",
    "PHOENIX_SETUP_SUMMARY.md"
)

foreach ($file in $phoenixFiles) {
    $srcPath = Join-Path $docsDir $file
    if (Test-Path $srcPath) {
        Move-Item -Path $srcPath -Destination $phoenixArchive -Force
        Write-Host "  ✓ Archived: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Not found: $file" -ForegroundColor Yellow
    }
}

# Archive Copilot Observability temporal docs
Write-Host "`n=== Archiving Copilot Observability Temporal Docs ===" -ForegroundColor Cyan
$copilotArchive = "$docsDir\archive\observability\2026-02-copilot"
$copilotFiles = @(
    "COPILOT_OBSERVABILITY_IMPLEMENTATION_STATUS.md",
    "COPILOT_OBSERVABILITY_TEST_RESULTS.md"
)

foreach ($file in $copilotFiles) {
    $srcPath = Join-Path $docsDir $file
    if (Test-Path $srcPath) {
        Move-Item -Path $srcPath -Destination $copilotArchive -Force
        Write-Host "  ✓ Archived: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Not found: $file" -ForegroundColor Yellow
    }
}

# Archive general implementation docs
Write-Host "`n=== Archiving Implementation Status Docs ===" -ForegroundColor Cyan
$implArchive = "$docsDir\archive\observability\2026-02-implementation"
$implFiles = @(
    "AGENT_OBSERVABILITY_IMPLEMENTATION.md",
    "IMPLEMENTATION_REPORT.md",
    "IMPLEMENTATION_STATUS.md",
    "OBSERVABILITY_SETUP_SUMMARY.md",
    "OPEN_SOURCE_OBSERVABILITY_SUMMARY.md"
)

foreach ($file in $implFiles) {
    $srcPath = Join-Path $docsDir $file
    if (Test-Path $srcPath) {
        Move-Item -Path $srcPath -Destination $implArchive -Force
        Write-Host "  ✓ Archived: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Not found: $file" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n=== Archive Summary ===" -ForegroundColor Cyan
$phoenixCount = (Get-ChildItem $phoenixArchive -File).Count
$copilotCount = (Get-ChildItem $copilotArchive -File).Count
$implCount = (Get-ChildItem $implArchive -File).Count

Write-Host "  Phoenix archive: $phoenixCount files" -ForegroundColor White
Write-Host "  Copilot archive: $copilotCount files" -ForegroundColor White
Write-Host "  Implementation archive: $implCount files" -ForegroundColor White
Write-Host "`n✓ Phase 1 archiving complete!" -ForegroundColor Green
