# ADR-0014: KM Agent Data Plane Session Startup Wiring

**Status**: Accepted  
**Date**: 2026-07-11  
**Supersedes**: N/A  
**Extends**: [ADR-0013](0013-dolt-beads-entire-agent-data-plane.md)

## Context

ADR-0013 adopted the dual-store agent data plane (Beads/Dolt/Entire beside Supabase). Operators still had to start Dolt and check Entire/Beads manually. Session start, worktree bootstrap, and F5 next-forge launches did not ensure the plane was up—and beads auto-backup Error 1105 spammed `bd ready`.

## Decision Drivers

* Agents and F5 flows must discover KM infrastructure without a separate mental model
* Product debug (next-forge) must not hard-fail when Dolt/Entire are missing on a machine
* KM debugging needs a strict path that fails when `km:status` fails
* Beads backup must not block daily `ready` / session start

## Considered Options

### Option 1: Parallel competing bootstrap (separate from session start)

**Pros**: Isolated failure domain  
**Cons**: Two systems to remember; easy to skip in worktrees

### Option 2: Soft KM bootstrap inside session start + VS Code dependsOn (chosen)

**Pros**: One primary hook; product path warns and continues; strict launch for KM work  
**Cons**: Session start slightly slower; duplicate idempotent calls from worktree + session start

### Option 3: Hard-require Dolt on all forge launches

**Pros**: Strong consistency  
**Cons**: Breaks ADR-0013 Supabase-first product CI/dev on machines without Dolt

## Decision

We will **extend agent session start with `scripts/km-session-bootstrap.ps1`**, wire it into worktree setup and VS Code tasks/launch (soft `dependsOn` for forge; strict launch for KM), and **disable broken beads auto-backup** until a clean `bd backup init` to `.beads/backup-store/`.

## Rationale

Primary hook stays session start (not a parallel system). Soft-fail preserves ADR-0013 product path. Strict launch covers agent/KM debugging. Backup disable removes Error 1105 without forcing Beads `--server` cutover.

## Consequences

### Positive

- Worktree step 9 and `yarn agent:session:start` bring up Dolt :3307 + health checks
- F5 **next-forge: dev core** runs soft KM first
- Compound **Full Stack: Forge Core + Agent Data Plane** for end-to-end KM + forge
- `yarn beads:ready` clean without Error 1105

### Negative

- Extra seconds on session start when Dolt cold-starts
- Operators must re-run `yarn hooks:install` if Entire overwrites ModMe hooks

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Soft path hides real KM outages | Use strict launch / `yarn km:bootstrap:strict` when debugging agents |
| Backup disabled long-term | Re-enable after `bd backup init .beads/backup-store` (gitignored) |

## Implementation

| Artifact | Path |
|----------|------|
| Bootstrap | `scripts/km-session-bootstrap.ps1` |
| Session start | `scripts/agent-session-start.ps1` |
| Worktree | `.cursor/setup-worktree-windows.ps1`, `.cursor/setup-worktree-unix.sh` |
| Tasks / launch | `.vscode/tasks.json`, `.vscode/launch.json`, `scripts/launch-manifest.json` |
| Beads config | `.beads/config.yaml` (`backup.enabled: false`) |
| Runbook | [`docs/monorepo/km-agent-data-plane-startup.md`](../../monorepo/km-agent-data-plane-startup.md) |
| Yarn | `km:bootstrap`, `km:bootstrap:strict`, `km:status`, `dolt:*`, `entire:*` |

```powershell
yarn km:bootstrap
node scripts/validate-launch-json.mjs --require-manifest-sync
yarn beads:ready
```

**Beads issue:** `modme-awz`

## Related Decisions

- **ADR-0013**: Dual-store agent data plane (Dolt/Beads/Entire + Supabase)
- **ADR-0011** (next-forge): Agent terminal orchestration without Nx
- **ADR-0010**: Historical catalog CMS evaluation (superseded by 0013 for agent plane)

## References

- [docs/debug-launch-guide.md](../../debug-launch-guide.md)
- [docs/KNOWLEDGE_QUICKSTART.md](../../KNOWLEDGE_QUICKSTART.md)
- [docs/beads-workflow.md](../../beads-workflow.md)
- [docs/monorepo/km-agent-data-plane-startup.md](../../monorepo/km-agent-data-plane-startup.md)

---

**ADR Created**: 2026-07-11  
**Last Updated**: 2026-07-11  
**Status**: Accepted
