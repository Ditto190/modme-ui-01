<#
.SYNOPSIS
  Verify ModMe Obsidian vault wiring and print open / Clipper setup steps.

.DESCRIPTION
  This repo is the vault (root contains .obsidian/). Web Clipper writes to
  GenerativeUI_monorepo/docs/inbox when the extension targets this vault.
#>
[CmdletBinding()]
param(
  [switch]$OpenVault
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$obsidian = Join-Path $repoRoot ".obsidian"
$inbox = Join-Path $repoRoot "GenerativeUI_monorepo\docs\inbox"
$clipper = Join-Path $repoRoot "templates\obsidian-clipper"

Write-Host "Repo / vault root: $repoRoot"

$ok = $true
if (-not (Test-Path $obsidian)) {
  Write-Host "FAIL: .obsidian missing - not a vault yet." -ForegroundColor Red
  $ok = $false
}
else {
  Write-Host "OK   .obsidian present"
}

if (-not (Test-Path $inbox)) {
  Write-Host "FAIL: inbox folder missing: $inbox" -ForegroundColor Red
  $ok = $false
}
else {
  Write-Host "OK   inbox: GenerativeUI_monorepo/docs/inbox"
}

$modmeTemplates = @(
  "modme-inbox-github-issue-pr.json",
  "modme-inbox-github-repo.json",
  "modme-inbox-docs-site.json",
  "modme-inbox-article-landing.json",
  "modme-inbox-generic-link.json",
  "modme-inbox-code-snippet.json",
  "chatgpt-clipper.json"
)
foreach ($t in $modmeTemplates) {
  $p = Join-Path $clipper $t
  if (Test-Path $p) {
    Write-Host "OK   template $t"
  }
  else {
    Write-Host "FAIL missing $t" -ForegroundColor Red
    $ok = $false
  }
}

$kepanoDir = Join-Path $clipper "kepano"
$kepanoCount = @(Get-ChildItem $kepanoDir -Filter "*.json" -ErrorAction SilentlyContinue).Count
Write-Host "OK   kepano templates: $kepanoCount"

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Obsidian -> Open folder as vault -> $repoRoot"
Write-Host "  2. Chrome Clipper -> Settings -> select vault Monorepo_ModMe"
Write-Host "  3. Import JSON from: $clipper"
Write-Host "  4. Template order: Issue/PR -> Code Snippet -> Repo -> Docs -> Article -> AI Chat -> kepano/* -> Generic Link last"
Write-Host "  5. Clip a page; confirm a new .md under GenerativeUI_monorepo/docs/inbox"
Write-Host "  6. yarn inbox:audit:funnel"

if ($OpenVault) {
  $uri = "obsidian://open?path=" + [uri]::EscapeDataString("$repoRoot")
  Write-Host ""
  Write-Host "Opening: $uri"
  Start-Process $uri
}

if (-not $ok) {
  exit 1
}
Write-Host ""
Write-Host "Vault wiring looks good." -ForegroundColor Green
