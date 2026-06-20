#Requires -Version 5.1
<#
.SYNOPSIS
  Configure Cursor AI resources for Monorepo_ModMe.

  Fixes: npx skills fails with "spawn git ENOENT" when Git is not on PATH.
  Installs: PatrickJS rules, sanjeed5 MDC rules, awesome-copilot (Cursor + Copilot),
            superpowers + awesome-cursor-skills (global).
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$VendorRoot = Join-Path $RepoRoot '.vendor'
$GlobalSkills = Join-Path $env:USERPROFILE '.cursor\skills'

function Ensure-GitOnPath {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host '[ok] git already on PATH'
        return
    }

    $candidates = @(
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files\Git\bin\git.exe',
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )

    foreach ($gitExe in $candidates) {
        if (Test-Path $gitExe) {
            $gitDir = Split-Path $gitExe -Parent
            $env:PATH = "$gitDir;$env:PATH"
            Write-Host "[ok] prepended Git to PATH: $gitDir"
            return
        }
    }

    Write-Warning 'Git not found. Attempting winget install Git.Git (may require elevation)...'
    try {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        foreach ($gitExe in $candidates) {
            if (Test-Path $gitExe) {
                $gitDir = Split-Path $gitExe -Parent
                $env:PATH = "$gitDir;$env:PATH"
                Write-Host "[ok] installed Git and added to PATH: $gitDir"
                return
            }
        }
    } catch {
        Write-Warning "winget install failed: $_"
    }

    Write-Warning 'Git unavailable — skill installs will use manual copy from .vendor instead of npx skills.'
}

function Ensure-VendorRepos {
    $repos = @(
        @{ Folder = 'awesome-cursor-skills-main'; Zip = 'awesome-cursor-skills'; Url = 'https://github.com/spencerpauly/awesome-cursor-skills/archive/refs/heads/main.zip' },
        @{ Folder = 'superpowers-main'; Zip = 'superpowers'; Url = 'https://github.com/obra/superpowers/archive/refs/heads/main.zip' },
        @{ Folder = 'awesome-cursorrules-main'; Zip = 'awesome-cursorrules'; Url = 'https://github.com/PatrickJS/awesome-cursorrules/archive/refs/heads/main.zip' },
        @{ Folder = 'awesome-cursor-rules-mdc-main'; Zip = 'awesome-cursor-rules-mdc'; Url = 'https://github.com/sanjeed5/awesome-cursor-rules-mdc/archive/refs/heads/main.zip' },
        @{ Folder = 'awesome-copilot-main'; Zip = 'awesome-copilot'; Url = 'https://github.com/github/awesome-copilot/archive/refs/heads/main.zip' }
    )

    New-Item -ItemType Directory -Force -Path $VendorRoot | Out-Null

    foreach ($r in $repos) {
        $dest = Join-Path $VendorRoot $r.Folder
        if (Test-Path $dest) {
            Write-Host "[skip] vendor exists: $($r.Folder)"
            continue
        }
        $zipPath = Join-Path $VendorRoot "$($r.Zip).zip"
        Write-Host "[download] $($r.Url)"
        Invoke-WebRequest -Uri $r.Url -OutFile $zipPath -UseBasicParsing
        Expand-Archive -Path $zipPath -DestinationPath $VendorRoot -Force
        Remove-Item $zipPath -Force
        Write-Host "[ok] extracted $($r.Folder)"
    }
}

function Copy-ItemForce($Source, $Dest) {
    $parent = Split-Path $Dest -Parent
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    if (Test-Path $Source) {
        $item = Get-Item -Path $Source -Force
        if ($item.PSIsContainer) {
            Copy-Item -Path $Source -Destination $Dest -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Copy-Item -Path $Source -Destination $Dest -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  [ok] copied to $Dest"
    } else {
        Write-Warning "  [skip] source not found: $Source"
    }
}

function Install-SkillFolder($SourceSkillDir, $TargetRoot, $SkillName) {
    $dest = Join-Path $TargetRoot $SkillName
    if (Test-Path $dest) { 
        Write-Host "  [skip] skill exists: $dest"
        return
    }
    Copy-Item -Path $SourceSkillDir -Destination $dest -Recurse -Force
    Write-Host "  skill -> $dest"
}

function Install-GlobalSkills {
    New-Item -ItemType Directory -Force -Path $GlobalSkills | Out-Null

    $superpowers = Join-Path $VendorRoot 'superpowers-main\skills'
    foreach ($name in @('systematic-debugging', 'test-driven-development', 'verification-before-completion')) {
        Install-SkillFolder (Join-Path $superpowers $name) $GlobalSkills $name
    }

    $acs = Join-Path $VendorRoot 'awesome-cursor-skills-main\resources'
    $acsSkills = @(
        'systematic-debugging', 'visual-qa-testing', 'creating-pr', 'grinding-until-pass',
        'verifying-in-browser', 'finding-dev-server-url', 'detecting-port-conflicts',
        'suggesting-cursor-rules', 'suggesting-cursor-hooks', 'suggesting-skills',
        'auto-type-checking', 'babysitting-pr', 'writing-commit-messages',
        'parallel-exploring', 'best-of-n-solving', 'monitoring-terminal-errors',
        'parallel-code-review', 'codebase-onboarding', 'writing-tests'
    )
    foreach ($name in $acsSkills) {
        $src = Join-Path $acs $name
        if (-not (Test-Path $src)) { Write-Warning "missing awesome-cursor-skills resource: $name"; continue }
        Install-SkillFolder $src $GlobalSkills $name
    }

    # Prefer npx skills when git works (dedupes superpowers systematic-debugging)
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host '[run] npx skills add obra/superpowers (global)...'
        Push-Location $RepoRoot
        try {
            npx --yes skills add obra/superpowers `
                --skill systematic-debugging --skill test-driven-development --skill verification-before-completion `
                -a cursor -g -y 2>&1 | Write-Host
        } catch {
            Write-Warning "npx skills (superpowers) failed; manual copies kept: $_"
        } finally { Pop-Location }

        Write-Host '[run] npx skills add spencerpauly/awesome-cursor-skills (global)...'
        Push-Location $RepoRoot
        try {
            npx --yes skills add spencerpauly/awesome-cursor-skills `
                --skill visual-qa-testing --skill creating-pr --skill grinding-until-pass `
                --skill verifying-in-browser --skill finding-dev-server-url `
                --skill detecting-port-conflicts --skill suggesting-cursor-rules `
                --skill suggesting-cursor-hooks --skill suggesting-skills `
                -a cursor -g -y 2>&1 | Write-Host
        } catch {
            Write-Warning "npx skills (awesome-cursor-skills) failed; manual copies kept: $_"
        } finally { Pop-Location }
    }
}

function Convert-CopilotInstructionToMdc($InstructionPath, $OutPath) {
    try {
        $raw = Get-Content -Path $InstructionPath -Raw -Encoding UTF8
        if ($raw -notmatch '(?s)^---\r?\n(.*?)\r?\n---\r?\n(.*)$') {
            Write-Warning "  [skip] no frontmatter in instruction: $InstructionPath"
            return
        }
        $fm = $Matches[1]
        $body = $Matches[2].TrimStart()

        $description = ''
        $globs = '**/*'
        foreach ($line in ($fm -split '\r?\n')) {
            if ($line -match '^description:\s*["'']?(.*?)["'']?\s*$') { $description = $Matches[1] }
            if ($line -match '^applyTo:\s*["'']?(.*?)["'']?\s*$') { $globs = $Matches[1] }
        }

        $name = [IO.Path]::GetFileNameWithoutExtension($OutPath) -replace '\.mdc$',''
        $mdc = @"
---
description: "$description"
globs: $globs
alwaysApply: false
---

$body
"@
        [System.IO.File]::WriteAllText($OutPath, $mdc, [System.Text.Encoding]::UTF8)
        Write-Host "  [ok] converted to $OutPath"
    } catch {
        Write-Warning "  [skip] failed to convert: $_"
    }
}

function Install-CursorRules {
    $rulesDir = Join-Path $RepoRoot '.cursor\rules'
    New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null

    # PatrickJS awesome-cursorrules
    $patrickSrc = Join-Path $VendorRoot 'awesome-cursorrules-main\rules'
    $patrickFiles = @(
        'typescript-react-cursorrules-prompt-file.mdc',
        'typescript-vite-tailwind-cursorrules-prompt-file.mdc',
        'cursor-ai-react-typescript-shadcn-ui-cursorrules-p.mdc',
        'nextjs15-supabase-cursorrules-prompt-file.mdc',
        'react-tanstack-router-query-cursorrules-prompt-file.mdc',
        'clean-code.mdc',
        'anti-overengineering.mdc',
        'git-conventional-commit-messages.mdc'
    )
    foreach ($f in $patrickFiles) {
        $src = Join-Path $patrickSrc $f
        if (-not (Test-Path $src)) { Write-Warning "missing patrickjs rule: $f"; continue }
        Copy-ItemForce $src (Join-Path $rulesDir "patrickjs-$f")
    }

    # sanjeed5 pre-generated MDC rules
    $sanjeedSrc = Join-Path $VendorRoot 'awesome-cursor-rules-mdc-main\rules-mdc'
    $sanjeedFiles = @(
        'react.mdc', 'typescript.mdc', 'next-js.mdc', 'supabase.mdc',
        'vite.mdc', 'vitest.mdc', 'react-query.mdc', 'vercel.mdc', 'eslint.mdc', 'zod.mdc'
    )
    foreach ($f in $sanjeedFiles) {
        $src = Join-Path $sanjeedSrc $f
        if (-not (Test-Path $src)) { Write-Warning "missing sanjeed5 rule: $f"; continue }
        Copy-ItemForce $src (Join-Path $rulesDir "sanjeed5-$f")
    }

    # awesome-copilot instructions -> Cursor rules
    $copilotInstr = Join-Path $VendorRoot 'awesome-copilot-main\instructions'
    $copilotFiles = @(
        'nextjs.instructions.md',
        'nextjs-tailwind.instructions.md',
        'code-review-generic.instructions.md',
        'github-actions-ci-cd-best-practices.instructions.md',
        'agent-skills.instructions.md',
        'a11y.instructions.md'
    )
    foreach ($f in $copilotFiles) {
        $src = Join-Path $copilotInstr $f
        if (-not (Test-Path $src)) { Write-Warning "missing copilot instruction: $f"; continue }
        $outName = 'copilot-' + ($f -replace '\.instructions\.md$','.mdc')
        Convert-CopilotInstructionToMdc $src (Join-Path $rulesDir $outName)
    }

    Write-Host '[ok] cursor rules installed under .cursor/rules/'
}

function Install-AwesomeCopilot {
    try {
        $copilotRoot = Join-Path $VendorRoot 'awesome-copilot-main'
        $githubDir = Join-Path $RepoRoot '.github'
        $instrDir = Join-Path $githubDir 'instructions'
        New-Item -ItemType Directory -Force -Path $instrDir | Out-Null

        # Copilot instructions (VS Code / Copilot CLI compatible)
        $copilotInstr = Join-Path $copilotRoot 'instructions'
        $copilotFiles = @(
            'nextjs.instructions.md',
            'nextjs-tailwind.instructions.md',
            'code-review-generic.instructions.md',
            'github-actions-ci-cd-best-practices.instructions.md',
            'agent-skills.instructions.md',
            'a11y.instructions.md'
        )
        foreach ($f in $copilotFiles) {
            Copy-ItemForce (Join-Path $copilotInstr $f) (Join-Path $instrDir $f)
        }

        $copilotInstructions = @'
# Monorepo_ModMe — GitHub Copilot instructions

Primary codebase: `GenerativeUI_monorepo/` (Turborepo + Yarn workspaces).

## Stack
- TypeScript (strict), React 18, Vite, TanStack Router/Query
- Tailwind CSS; Adobe React Spectrum in `@adaptiveworx/ui`
- Next.js apps exist under `packages/example-next-application` and workbench envs
- Supabase where configured; prefer RLS and server-side `getUser()` over `getSession()`

## Monorepo conventions
- Run tasks from package roots or via `turbo run <task>` from `GenerativeUI_monorepo/`
- Respect workspace package boundaries (`apps/*`, `packages/*`)
- Match existing ESLint/Biome/Prettier config per package
- Keep changes minimal; do not refactor unrelated code

## Agent resources in this repo
- Cursor rules: `.cursor/rules/` (PatrickJS, sanjeed5 MDC, awesome-copilot conversions)
- Cursor/Copilot skills: `.agents/skills/` (symlinked from awesome-copilot selection)
- Vendor sources: `.vendor/awesome-copilot-main/` (update via `scripts/cursor-ai/setup.ps1`)
- Full awesome-copilot catalog: https://awesome-copilot.github.com

## Quality bar
- Verify with package scripts (`test`, `lint`, `type-check`) before claiming done
- Prefer TDD for new behavior; run existing tests after edits
- For PRs: conventional commits, focused diffs, no secrets in repo

See also per-file instructions in `.github/instructions/` (from github/awesome-copilot).
'@
        [System.IO.File]::WriteAllText((Join-Path $githubDir 'copilot-instructions.md'), $copilotInstructions, [System.Text.Encoding]::UTF8)

        # Project skills from awesome-copilot (canonical: .agents/skills)
        $agentsSkills = Join-Path $RepoRoot '.agents\skills'
        $cursorSkills = Join-Path $RepoRoot '.cursor\skills'
        New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
        New-Item -ItemType Directory -Force -Path $cursorSkills | Out-Null

        $skillNames = @(
            'acquire-codebase-knowledge',
            'create-agentsmd',
            'github-actions-efficiency',
            'quality-playbook',
            'doublecheck',
            'react18-dep-compatibility'
        )
        $copilotSkills = Join-Path $copilotRoot 'skills'
        foreach ($name in $skillNames) {
            $src = Join-Path $copilotSkills $name
            if (-not (Test-Path $src)) { Write-Warning "missing awesome-copilot skill: $name"; continue }
            Install-SkillFolder $src $agentsSkills $name
            # Mirror into .cursor/skills for Cursor discovery
            $link = Join-Path $cursorSkills $name
            $target = Join-Path $agentsSkills $name
            if (Test-Path $link) { Write-Host "  [skip] link exists: $link" }
            else {
                try {
                    $mklink = cmd /c "mklink /J `"$link`" `"$target`" 2>&1"
                    if ($LASTEXITCODE -ne 0) {
                        Copy-Item -Path $target -Destination $link -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Host "  [ok] copied skill to $link"
                    } else {
                        Write-Host "  [ok] linked skill to $link"
                    }
                } catch {
                    Write-Warning "  [skip] failed to link/copy: $_"
                }
            }
        }

        # Project MCP snippet (merge-safe reference)
        $projectMcp = Join-Path $RepoRoot '.cursor\mcp.json'
        if (-not (Test-Path $projectMcp)) {
            $mcpContent = @'
{
  "mcpServers": {}
}
'@
            [System.IO.File]::WriteAllText($projectMcp, $mcpContent, [System.Text.Encoding]::UTF8)
        }

        Write-Host '[ok] awesome-copilot configured (.github + .agents/skills)'
    } catch {
        Write-Warning "  [skip] awesome-copilot install failed: $_"
    }
}

function Write-AgentsMd {
    $path = Join-Path $RepoRoot 'AGENTS.md'
    if (Test-Path $path) {
        Write-Host '[skip] AGENTS.md already exists'
        return
    }
    $content = @'
# AGENTS.md — Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot working in this repository.

## Repository layout
- **`GenerativeUI_monorepo/`** — main Turborepo (Yarn 3 workspaces, Turbo)
  - `apps/` — applications (web, API, agent, dashboard, etc.)
  - `packages/` — shared libraries and example apps
  - `UniversalWorkbench/` — workbench monorepo variant (staging/dev copies also exist)
- **`.cursor/rules/`** — Cursor project rules (MDC). Includes lean-ctx, PatrickJS, sanjeed5, awesome-copilot.
- **`.agents/skills/`** — Agent skills (Cursor + Copilot compatible SKILL.md format)
- **`.github/copilot-instructions.md`** — always-on Copilot instructions
- **`.github/instructions/`** — file-scoped Copilot instructions from awesome-copilot
- **`.vendor/awesome-copilot-main/`** — vendored github/awesome-copilot (refresh via setup script)

## Default commands
From `GenerativeUI_monorepo/`:
```bash
yarn install
yarn dev          # turbo run dev
yarn build        # turbo run build
yarn test         # monorepo test runner
yarn lint         # turbo run lint
```

Per-package scripts vary (Vite/Biome/Vitest vs Next.js). Check the nearest `package.json`.

## Agent behavior
1. Read `package.json` in the target package before changing build/test commands.
2. Use workspace protocol dependencies (`workspace:*`) for internal packages.
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless the task explicitly targets them.
4. Run verification in the affected package before marking work complete.
5. For browser/UI work, use Cursor browser MCP skills (`visual-qa-testing`, `verifying-in-browser`).

## Updating AI configuration
```powershell
.\scripts\cursor-ai\setup.ps1
```

## External references
- [awesome-copilot](https://github.com/github/awesome-copilot) — community agents, instructions, skills
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)
'@
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host '[ok] created AGENTS.md'
}

function Write-MonorepoRule {
    $path = Join-Path $RepoRoot '.cursor\rules\monorepo-modme.mdc'
    if (Test-Path $path) {
        Write-Host '[skip] monorepo-modme.mdc already exists'
        return
    }
    $content = @'
---
description: "Monorepo_ModMe project context — Turborepo layout, package boundaries, and verification expectations."
globs: GenerativeUI_monorepo/**/*
alwaysApply: false
---

# Monorepo_ModMe

## Layout
- Primary work happens under `GenerativeUI_monorepo/`.
- Yarn 3 workspaces: `apps/*`, `packages/*`.
- Turbo orchestrates `dev`, `build`, `lint`, `test` from the monorepo root.

## Editing rules
- Change only packages affected by the task.
- Prefer `workspace:*` for internal dependencies.
- Match the linter/formatter already configured in each package (ESLint or Biome).
- UniversalWorkbench has its own root `package.json`; do not assume scripts from the template monorepo root.

## Verification
- Run the nearest package's `test`, `lint:check` or `lint`, and `type-check` when available.
- For UI changes in Vite apps, run `dev` or `build` in that app package.

## AI asset locations
- Rules: `.cursor/rules/`
- Skills: `.agents/skills/` and `.cursor/skills/`
- Copilot: `.github/copilot-instructions.md`
'@
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host '[ok] created monorepo-modme.mdc'
}

function Install-GitHooks {
    try {
        $installer = Join-Path $RepoRoot 'scripts\install-git-hooks.ps1'
        if (-not (Test-Path $installer)) {
            Write-Warning 'scripts/install-git-hooks.ps1 not found - skipping hook install'
            return
        }
        & $installer
    } catch {
        Write-Warning "Git hooks install failed: $_"
        Write-Host "To install git hooks manually, run: powershell -ExecutionPolicy Bypass -File `"$installer`""
    }
}

function Test-LeanCtx {
    Write-Host '[check] lean-ctx...' -ForegroundColor Cyan
    $leanCtx = Get-Command lean-ctx -ErrorAction SilentlyContinue
    if (-not $leanCtx) {
        $settingsPath = Join-Path $RepoRoot '.vscode\settings.json'
        if (Test-Path $settingsPath) {
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            $binary = $settings.'leanctx.binaryPath'
            if ($binary -and (Test-Path $binary)) {
                $leanCtx = Get-Command $binary
            }
        }
    }
    if (-not $leanCtx) {
        Write-Warning 'lean-ctx not on PATH. See docs/agent-tech-guide.md for install.'
        return $false
    }
    & $leanCtx.Source doctor 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'lean-ctx doctor reported issues'
        return $false
    }
    Write-Host '[ok] lean-ctx doctor'
    return $true
}

function Test-WorktreeInfrastructure {
    Write-Host '[check] worktree infrastructure...' -ForegroundColor Cyan
    $requiredScripts = @(
        'init-worktrees.ps1',
        'new-agent-worktree.ps1',
        'worktree-allocate-ports.ps1',
        'smoke-test-worktrees.ps1',
        'list-worktrees.ps1',
        'validate-launch-json.mjs'
    )
    $missing = @()
    foreach ($s in $requiredScripts) {
        if (-not (Test-Path (Join-Path $RepoRoot "scripts\$s"))) { $missing += $s }
    }
    if ($missing.Count -gt 0) {
        Write-Warning "Missing worktree scripts: $($missing -join ', ')"
        return $false
    }

    $worktreesJson = Join-Path $RepoRoot '.cursor\worktrees.json'
    if (-not (Test-Path $worktreesJson)) {
        Write-Warning '.cursor/worktrees.json missing'
        return $false
    }
    $wt = Get-Content $worktreesJson -Raw | ConvertFrom-Json
    $winSetup = $wt.'setup-worktree-windows'
    if (-not $winSetup -or -not (Test-Path (Join-Path $RepoRoot ".cursor\$winSetup"))) {
        Write-Warning 'Cursor worktree bootstrap script missing (.cursor/setup-worktree-windows.ps1)'
        return $false
    }
    if (-not $wt.'setup-worktree-unix' -or -not (Test-Path (Join-Path $RepoRoot ".cursor\$($wt.'setup-worktree-unix')"))) {
        Write-Warning 'Unix worktree bootstrap script missing (.cursor/setup-worktree-unix.sh)'
        return $false
    }

    $projectName = Split-Path -Leaf $RepoRoot
    $devCheckout = Join-Path (Split-Path -Parent $RepoRoot) "$projectName-dev\dev"
    if (-not (Test-Path $devCheckout)) {
        Write-Warning "Dev worktree not initialized. Run: .\scripts\init-worktrees.ps1"
    }
    else {
        Write-Host "[ok] dev worktree: $devCheckout"
    }

    Push-Location $RepoRoot
    try {
        node scripts/validate-launch-json.mjs 2>&1 | Write-Host
        if ($LASTEXITCODE -ne 0) { return $false }
    }
    finally { Pop-Location }
    Write-Host '[ok] launch.json validation'
    return $true
}

function Test-WorktreePortAllocation {
    Write-Host '[check] worktree port allocation...' -ForegroundColor Cyan
    $tmp = Join-Path $env:TEMP "wt-setup-check-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    try {
        $envFile = & (Join-Path $RepoRoot 'scripts\worktree-allocate-ports.ps1') -WorktreePath $tmp
        if (-not (Test-Path $envFile)) {
            Write-Warning 'worktree-allocate-ports.ps1 did not write .worktree-ports.env'
            return $false
        }
        $content = Get-Content $envFile -Raw
        if ($content -notmatch 'WORKTREE_SLOT=' -or $content -notmatch 'WEB_DASHBOARD_PORT=') {
            Write-Warning 'Invalid .worktree-ports.env output'
            return $false
        }
        Write-Host '[ok] port allocation script'
        return $true
    }
    finally {
        Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    }
}

function Test-TerminalHooks {
    Write-Host '[check] terminal hooks...' -ForegroundColor Cyan
    $marker = '# >>> Monorepo_ModMe terminal hooks >>>'
    $profiles = @($PROFILE)
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        $profiles += (pwsh -NoProfile -Command 'Write-Output $PROFILE').Trim()
    }

    foreach ($p in ($profiles | Select-Object -Unique)) {
        if ((Test-Path $p) -and ((Get-Content $p -Raw -ErrorAction SilentlyContinue) -match [regex]::Escape($marker))) {
            Write-Host "[ok] terminal hooks in $p"
            return $true
        }
    }

    Write-Warning 'PowerShell profile missing Monorepo_ModMe hooks. Run: .\scripts\install-pwsh-terminal-hooks.ps1'
    return $false
}

function Test-CursorHooks {
    Write-Host '[check] Cursor project hooks...' -ForegroundColor Cyan
    $hooksJson = Join-Path $RepoRoot '.cursor\hooks.json'
    if (-not (Test-Path $hooksJson)) {
        Write-Warning '.cursor/hooks.json missing'
        return $false
    }

    try {
        $config = Get-Content $hooksJson -Raw | ConvertFrom-Json
    } catch {
        Write-Warning ".cursor/hooks.json is invalid JSON: $_"
        return $false
    }

    $hookEvents = @($config.hooks.PSObject.Properties | Where-Object { $_.Value.Count -gt 0 })
    if ($hookEvents.Count -eq 0) {
        Write-Host '[ok] Cursor hooks disabled (empty hooks map)'
        return $true
    }

    Write-Warning "Cursor hooks are enabled ($($hookEvents.Count) event type(s)). Re-run setup only after editing .cursor/hooks.json intentionally."
    return $true
}

function Test-MultiIdeWorktreeOwners {
    Write-Host '[check] multi-IDE worktree owners...' -ForegroundColor Cyan
    $scriptPath = Join-Path $RepoRoot 'scripts\new-agent-worktree.ps1'
    $content = Get-Content $scriptPath -Raw
    $owners = @('cursor', 'copilot', 'claude', 'antigravity', 'human')
    $missing = @($owners | Where-Object { $content -notmatch $_ })
    if ($missing.Count -gt 0) {
        Write-Warning "new-agent-worktree.ps1 missing owners: $($missing -join ', ')"
        return $false
    }
    Write-Host "[ok] owners: $($owners -join ', ')"
    return $true
}

# --- main ---
Write-Host "=== Cursor AI setup ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Ensure-GitOnPath
Ensure-VendorRepos
Install-GlobalSkills
Install-CursorRules
Write-MonorepoRule
Install-AwesomeCopilot
Write-AgentsMd
Install-GitHooks

Write-Host ''
Write-Host '=== Environment verification ===' -ForegroundColor Cyan
$checkResults = @(
    (Test-LeanCtx),
    (Test-WorktreeInfrastructure),
    (Test-WorktreePortAllocation),
    (Test-MultiIdeWorktreeOwners),
    (Test-CursorHooks),
    (Test-TerminalHooks)
)
$failedChecks = @($checkResults | Where-Object { $_ -eq $false }).Count
if ($failedChecks -gt 0) {
    Write-Warning "$failedChecks environment check(s) reported issues (non-fatal). See warnings above."
}

Write-Host ''
Write-Host 'Done. Restart Cursor to reload rules and skills.' -ForegroundColor Green
Write-Host 'Global skills: ' $GlobalSkills
Write-Host 'Project rules:  ' (Join-Path $RepoRoot '.cursor\rules')
Write-Host 'Project skills: ' (Join-Path $RepoRoot '.agents\skills')
