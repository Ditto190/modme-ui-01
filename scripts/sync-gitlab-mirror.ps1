# Push current branch to GitLab mirror remote (optional local sync).
param(
  [string]$Branch = '',
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = (git rev-parse --show-toplevel).Trim()
if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (git -C $RepoRoot branch --show-current).Trim()
}

$gitlabRemote = (git -C $RepoRoot remote get-url gitlab 2>$null).Trim()
if (-not $gitlabRemote) {
  Write-Error "No gitlab remote configured. Add with: git remote add gitlab <your-gitlab-repo-url>"
}

Write-Host "Sync GitHub -> GitLab mirror" -ForegroundColor Cyan
Write-Host "  branch: $Branch"
Write-Host "  remote: $gitlabRemote"

if ($DryRun) {
  Write-Host "Dry run: would run git push gitlab ${Branch}:refs/heads/${Branch}" -ForegroundColor Yellow
  exit 0
}

git -C $RepoRoot push gitlab "${Branch}:refs/heads/${Branch}"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$stampPath = Join-Path $RepoRoot '.gitlab-mirror-last-sync'
Set-Content -Path $stampPath -Value "$(Get-Date -Format 'o') $Branch" -Encoding utf8
Write-Host "OK - GitLab mirror updated" -ForegroundColor Green
