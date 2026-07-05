# Copilot Workspace + Builder Orchestration — Incident Runbook

**Service:** GitHub Copilot App workspace lifecycle + ModMe builder orchestration (SWC, Vite, Dolt)  
**Owner:** Platform / agent orchestration  
**Docs:** [`docs/copilot-workspace-orchestration.md`](../copilot-workspace-orchestration.md)  
**Runbook review:** [`docs/runbooks/reviews/copilot-builders-review-latest.md`](reviews/copilot-builders-review-latest.md)

---

## Overview & Impact

| Component | Failure symptom | User impact |
|-----------|-----------------|-------------|
| `session.create` lifecycle | Bootstrap hangs or errors | Copilot workspace unusable |
| SWC builder | `builders: FAIL` on ensure/build | Transpile smoke fails; session may still open |
| Vite builder | Port clash or missing deps | `vibe-web-app` dev/build broken |
| Dolt (optional) | `dolt: command not found` | Catalog CMS eval only — **non-blocking** |
| `.worktreeinclude` | Missing `.env` / lockfiles | Yarn/bun install fails in new worktree |

**Severity guide**

| SEV | Condition | Response |
|-----|-----------|----------|
| SEV2 | Copilot session.create fails for all users | 30 min |
| SEV3 | Builders fail but forge/workbench works | 2 h |
| SEV4 | Dolt optional path only | Next business day |

---

## Detection & Alerts

### Symptoms

- Copilot App shows bootstrap / lifecycle script failure
- `logs/copilot/workspace-lifecycle.jsonl` missing `session.create` or `status: ok`
- `yarn preflight:copilot` or `yarn preflight:builders` exits non-zero
- Run script `builders:ensure` / `builders:build` fails in Copilot UI

### Quick checks

```powershell
# From repo / worktree root
yarn preflight:copilot
yarn preflight:builders
node scripts/builders-orchestrator.mjs list
Get-Content logs/copilot/workspace-lifecycle.jsonl -Tail 5
```

---

## Initial Triage (First 5 Minutes)

| Symptom | Likely cause | Go to |
|---------|--------------|-------|
| `Unknown builder` / manifest parse error | Bad `builders.manifest.json` | § Mitigation — Manifest |
| `npx swc` / `@swc/core` missing | SWC not installed | § SWC missing |
| `vite --version` fails | Missing deps in `vibe-web-app` | § Vite |
| `EADDRINUSE` on dev | Port clash | § Vite port clash |
| `dolt: command not found` | Dolt not installed | § Dolt optional |
| `.env` / `yarn.lock` missing in worktree | `.worktreeinclude` not applied | § Worktree env |
| `pwsh` / lifecycle script not found | Untrusted `github-app.yml` | § Trust / config |

### Classification checklist

- [ ] Is this main checkout or Copilot worktree?
- [ ] Did `session.create` or `session.archive` fail?
- [ ] Is failure blocking (SWC/Vite) or optional (Dolt)?
- [ ] Recent change to `builders.manifest.json` or `github-app.yml`?

---

## Mitigation Procedures

### Manifest / orchestrator errors

```powershell
node scripts/builders-orchestrator.mjs list
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/builders-orchestrator.test.mjs
```

Restore last known-good `scripts/builders.manifest.json` from `dev` if corrupted.

### Builders fail (SWC / Vite)

```powershell
yarn builders:ensure
yarn builders:verify
node scripts/builders-orchestrator.mjs pipeline preflight-builders
```

If `ensure` modified `package.json`, run `yarn install` at repo root.

### SWC missing

```powershell
yarn builders:ensure --builder swc
# or manually:
yarn add -D @swc/cli @swc/core
npx swc --version
```

Config: `config/builders/swc.swcrc`. Prebuilt binaries: [swc.rs download](https://swc.rs/#download-prebuilt-binaries).

### Vite missing or build fails

```powershell
cd GenerativeUI_monorepo/apps/vibe-web-app
yarn install
npx vite --version
yarn build
```

### Vite port clash

```powershell
# Regenerate ports
node scripts/copilot-workspace/generate-env.mjs
# Inspect assigned port
Select-String VIBE_WEB_PORT .copilot/workspace.generated.env
# Or set explicitly
$env:VIBE_WEB_PORT = "3010"
yarn builders:vite:dev
```

See `scripts/launch-manifest.json` + worktree slot offset in `generate-env.mjs`.

### Dolt optional (non-blocking)

Dolt failure during `copilot-session-create` is **expected** when Dolt is not installed.

```powershell
yarn builders:dolt:status
# Install if evaluating catalog CMS:
# winget install DoltHub.Dolt
```

Catalog path: `config/dolt/catalog/` — [ADR-0010](../architecture/decisions/0010-dolt-catalog-cms-evaluation.md).

### Worktree env / lockfiles missing

1. Confirm `.worktreeinclude` exists at repo root.
2. Re-trust `.github/github-app.yml` in Copilot Project Settings.
3. Manual fallback from main checkout:

```powershell
pwsh -File scripts/copilot-workspace/bootstrap.ps1
# or
pwsh -File scripts/worktree-copy-env.ps1
```

### Trust / github-app.yml

Copilot App must **trust** repository configuration before lifecycle scripts run. Verify:

- `scripts/copilot-workspace/lifecycle.ps1` exists
- Branch prefix `feature/copilot/` in `.github/github-app.yml`

---

## Verification & Rollback

### Verification (all must pass for green)

```powershell
yarn preflight:copilot
yarn preflight:builders
node scripts/builders-orchestrator.mjs pipeline preflight-builders
```

### Rollback

| Change type | Action |
|-------------|--------|
| Bad `builders.manifest.json` | `git checkout dev -- scripts/builders.manifest.json` |
| Bad `github-app.yml` | `git checkout dev -- .github/github-app.yml` |
| Accidental `package.json` dep bump | Revert `devDependencies` for `@swc/*` |
| Broken hook | Restore `.github/hooks/hooks.json` from `dev` |

---

## Escalation Matrix

| Condition | Escalate to | Action |
|-----------|-------------|--------|
| SEV2 > 30 min | Repo maintainer | Check Copilot App trust + CI |
| Repeated SWC binary failures on Windows | Platform | Verify `@swc/core` prebuilt for arch |
| Secrets leaked via worktree copy | Security | Rotate keys; audit `.worktreeinclude` |
| All agent surfaces blocked | `#agent-orchestration` | Compare Cursor vs Copilot bootstrap paths |

---

## Communication Templates

### Initial (internal)

```
INCIDENT: Copilot workspace bootstrap / builder failure

Severity: SEV3
Status: Investigating
Impact: Copilot session.create failing / builders preflight red
Start: [TIME]
Commander: [NAME]

Actions:
- yarn preflight:copilot / preflight:builders
- Checking logs/copilot/workspace-lifecycle.jsonl

Updates: [channel]
```

### Mitigating

```
UPDATE: Copilot builder incident

Status: Mitigating
Cause: [SWC missing | Vite port clash | manifest typo | trust]
Fix: [yarn builders:ensure | regenerate env | revert manifest]

Next: Verify preflight:builders green
```

### Resolved

```
RESOLVED: Copilot workspace builder incident

Duration: [N] min
Root cause: [one line]
Fix: [commands / revert]
Follow-up: Postmortem if SEV2; update runbook if new edge case
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `yarn preflight:copilot` | Config + generate-env smoke |
| `yarn preflight:builders` | SWC/Vite pipeline smoke |
| `yarn builders:pipeline` | Full `copilot-session-create` pipeline |
| `pwsh -File scripts/copilot-workspace/lifecycle.ps1` | Manual lifecycle (set `COPILOT_SCRIPT_TRIGGER`) |
