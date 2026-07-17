<#
.SYNOPSIS
  Create a lean sidecar Obsidian vault (ModMe-Vault) outside the monorepo with directory junctions
  to inbox, docs, clipper templates, and Obsidian note templates.

.DESCRIPTION
  Solves slow Obsidian indexing by keeping the vault separate from the massive monorepo.
  Uses Windows junctions (directory links) to maintain file paths for Clipper ingest.

.PARAMETER VaultPath
  Path to create the sidecar vault (default: C:\Users\dylan\ModMe-Vault)

.PARAMETER MonorepoRoot
  Path to the monorepo (default: auto-detect parent of this script)

.PARAMETER OpenVault
  If set, opens the new vault in Obsidian after setup

.EXAMPLE
  .\scripts\setup-modme-obsidian-sidecar.ps1
  .\scripts\setup-modme-obsidian-sidecar.ps1 -OpenVault
#>
[CmdletBinding()]
param(
  [string]$VaultPath = "C:\Users\dylan\ModMe-Vault",
  # Do not use $PSScriptRoot in param defaults — it is empty during default binding
  # when yarn/nested powershell invoke this script.
  [string]$MonorepoRoot = "",
  [switch]$OpenVault
)

$ErrorActionPreference = "Stop"

if (-not $MonorepoRoot) {
  $scriptDir = $PSScriptRoot
  if (-not $scriptDir -and $PSCommandPath) {
    $scriptDir = Split-Path -Parent $PSCommandPath
  }
  if (-not $scriptDir -and $MyInvocation.MyCommand.Path) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  }
  if (-not $scriptDir) {
    throw "Cannot resolve script directory (PSScriptRoot empty). Pass -MonorepoRoot explicitly."
  }
  $MonorepoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
}

Write-Host "=== ModMe Sidecar Obsidian Vault Setup ===" -ForegroundColor Cyan
Write-Host "Vault:    $VaultPath"
Write-Host "Monorepo: $MonorepoRoot"
Write-Host ""

# Ensure vault root exists
if (-not (Test-Path $VaultPath)) {
  Write-Host "Creating vault directory: $VaultPath"
  New-Item -ItemType Directory -Path $VaultPath -Force | Out-Null
}

# Create .obsidian config directory
$obsidianDir = Join-Path $VaultPath ".obsidian"
if (-not (Test-Path $obsidianDir)) {
  Write-Host "Creating .obsidian config directory"
  New-Item -ItemType Directory -Path $obsidianDir -Force | Out-Null
}

# Create app.json (leaner than main checkout)
$appJsonPath = Join-Path $obsidianDir "app.json"
$appJson = @{
  "attachmentFolderPath" = "attachments"
  "newFileLocation"      = "folder"
  "newFileFolderPath"    = "inbox"
  "alwaysUpdateLinks"    = $true
  "userIgnoreFilters"    = @(
    "*.lock",
    "*.json",
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx",
    "*.py",
    ".git/",
    ".yarn/",
    ".env",
    ".env.*"
  )
}
Write-Host "Writing app.json"
$appJson | ConvertTo-Json | Set-Content $appJsonPath -Encoding UTF8

# Create other minimal config files
@("appearance.json", "bookmarks.json", "community-plugins.json", "core-plugins.json", "daily-notes.json", "templates.json", "types.json") | ForEach-Object {
  $filePath = Join-Path $obsidianDir $_
  if (-not (Test-Path $filePath)) {
    "{}" | Set-Content $filePath -Encoding UTF8
  }
}

# Create junctions for linked folders
$junctions = @(
  @{ name = "inbox"; target = Join-Path $MonorepoRoot "GenerativeUI_monorepo\docs\inbox" },
  @{ name = "docs"; target = Join-Path $MonorepoRoot "docs" },
  @{ name = "clipper"; target = Join-Path $MonorepoRoot "templates\obsidian-clipper" },
  @{ name = "Templates"; target = Join-Path $MonorepoRoot "templates\obsidian-note-templates" }
)

foreach ($junction in $junctions) {
  $linkPath = Join-Path $VaultPath $junction.name
  $targetPath = $junction.target
  
  if (-not (Test-Path $targetPath)) {
    Write-Host "WARNING: Skipping junction $($junction.name) - target not found: $targetPath" -ForegroundColor Yellow
    continue
  }
  
  if (Test-Path $linkPath) {
    Write-Host "OK: Junction already exists: $($junction.name)"
  }
  else {
    Write-Host "Creating junction: $($junction.name) to $targetPath"
    # Use mklink /J (directory junction)
    cmd /c mklink /J "$linkPath" "$targetPath" | Out-Null
  }
}

# Create root vault note
$vaultNotePath = Join-Path $VaultPath "ModMe Vault (Sidecar).md"
$vaultNoteContent = @"
# ModMe Vault (Sidecar)

Lean Obsidian vault for knowledge management, separate from the main Monorepo_ModMe checkout.

Real files are in the monorepo; this vault accesses them via directory junctions.

## Setup

- Vault root: $VaultPath
- Monorepo root: $MonorepoRoot
- Junctions:
  - inbox/ points to GenerativeUI_monorepo/docs/inbox (Clipper destination)
  - docs/ points to docs (ADRs, pipeline docs, ADAM notes)
  - clipper/ points to templates/obsidian-clipper (Clipper JSON templates)
  - Templates/ points to templates/obsidian-note-templates (Obsidian note templates)

## How it works

1. Clipper writes to vault inbox/ folder.
2. Junction redirects to the real GenerativeUI_monorepo/docs/inbox/.
3. Git sees the real files and can commit them.
4. Obsidian stays fast — only indexes vault root, not the massive monorepo.

## Templates

Import Clipper templates from clipper/ subfolder. Template path is already set to inbox (vault-relative).

Obsidian Settings → Core plugins → Templates → folder: `Templates`.

## KM stack (Project A.D.A.M)

Open `docs/adam/ADAM Index.md` as the vault home MOC.

| Layer | Vault path |
|-------|------------|
| Dashboards | `docs/adam/ADAM Command Center.md` + `.base` |
| Visual map | `docs/adam/ADAM Command Center.canvas` |
| Semantic links | `docs/adam/ADAM Semantic Map.md` |
| Plugin policy | `docs/adam/Vault Plugin Policy.md` |
| Query tools | `docs/adam/Query Tool Guide.md` |

Enable core plugins: **Templates**, **Properties**, **Daily notes**, **Bases**, **Canvas**.

## Project A.D.A.M (Obsidian Copilot)

1. Open docs/adam/ADAM Index.md
2. Copy docs/adam/copilot-project-system-prompt.md (section below the line) into Copilot → Projects → Project A.D.A.M
3. Prefer {[[Note]]} / {#tag} / {docs/adam} — never paste whole {inbox}


## Limitations

- Obsidian Git plugin only tracks the vault's own .git/, not the monorepo (use git CLI from monorepo root).
- Junctions on Windows only. For macOS/Linux, use symbolic links.
- If you modify plugin state, it syncs across all vaults that share the same .obsidian/ (if you later clone the vault).

## Performance

- Vault startup: 1-2s (vs. 10-30s for the full monorepo).
- Ingest workflow: same as before (Clipper writes, yarn intake reads real files).
- IDE: still open the full monorepo in Cursor.
"@
$vaultNoteContent | Set-Content $vaultNotePath -Encoding UTF8

Write-Host ""
Write-Host "SUCCESS: Sidecar vault created: $VaultPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Obsidian: Open folder as vault -> $VaultPath"
Write-Host "  2. Obsidian Settings: Core plugins (Templates, Properties, Daily notes, Bases, Canvas); Templates folder = Templates"
Write-Host "  3. Open docs/adam/ADAM Index.md and ADAM Command Center (.base / .canvas)"
Write-Host "  4. Chrome Clipper: Settings -> select vault ModMe-Vault"
Write-Host "  5. Import JSON from clipper/ subfolder in vault"
Write-Host "  6. Confirm a clip lands in inbox/ (which is the real monorepo path)"
Write-Host "  7. yarn intake:orchestrate (from monorepo root)"
Write-Host "  8. Copilot Project A.D.A.M: paste docs/adam/copilot-project-system-prompt.md"

if ($OpenVault) {
  Write-Host ""
  Write-Host "Opening vault in Obsidian..."
  $uri = "obsidian://open?path=" + [uri]::EscapeDataString("$VaultPath")
  Start-Process $uri
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
