# Vendors gh-aw v0.71.5 prompt files, runbooks, agents, and llms.txt into this repo.
param(
    [string]$Tag = "v0.71.5"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$BaseUrl = "https://raw.githubusercontent.com/github/gh-aw/$Tag"

function Save-RemoteFile {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    $dir = Split-Path $Destination -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    Write-Host "  + $Destination"
}

Write-Host "Downloading gh-aw $Tag assets into $RepoRoot"

$awDir = Join-Path $RepoRoot ".github/aw"
$awNames = gh api "repos/github/gh-aw/contents/.github/aw?ref=$Tag" --jq '.[].name'
foreach ($name in $awNames) {
    if ($name -eq "runbooks") { continue }
    Save-RemoteFile "$BaseUrl/.github/aw/$name" (Join-Path $awDir $name)
}

$runbookDir = Join-Path $awDir "runbooks"
foreach ($name in @("README.md", "workflow-health.md")) {
    Save-RemoteFile "$BaseUrl/.github/aw/runbooks/$name" (Join-Path $runbookDir $name)
}

Save-RemoteFile "https://github.github.com/gh-aw/llms.txt" (Join-Path $awDir "llms.txt")
Save-RemoteFile "$BaseUrl/create.md" (Join-Path $RepoRoot "docs/gh-aw-create.md")

$agentsDir = Join-Path $RepoRoot ".github/agents"
$agentNames = gh api "repos/github/gh-aw/contents/.github/agents?ref=$Tag" --jq '.[].name'
foreach ($name in $agentNames) {
    Save-RemoteFile "$BaseUrl/.github/agents/$name" (Join-Path $agentsDir $name)
}

Write-Host "Done. Run: gh aw compile --validate"
