# Polis-style routing (lightweight)

ModMe uses **citizen cards** in [`data/agent-citizens/`](../../data/agent-citizens/) instead of a full `_polis/` scaffold.

## Router

```bash
node scripts/lib/polis-router.mjs --labels ci-cd,devops-autofix --self-heal
```

API: [`scripts/lib/polis-router.mjs`](../../scripts/lib/polis-router.mjs)

```javascript
import { routeContract } from "./scripts/lib/polis-router.mjs";

const route = routeContract({
  labels: ["ci-cd", "devops-autofix"],
  changedPaths: [".github/workflows/ci.yml"],
  selfHeal: "Yes",
  beadsId: "modme-aqu",
  pipelineSuccess: false,
});
// → { citizenId, skills, verifyCommands, gitlabFlow, maxRounds }
```

## Citizens

| ID | When |
|----|------|
| `devops-ci-champion` | `ci-cd` + self-heal Yes |
| `forge-reviewer` | `next-forge/**` |
| `generative-reviewer` | `GenerativeUI_monorepo/**` |
| `beads-orchestrator` | beads-linked / ready without GitHub issue |
| `bugbot-merge-champion` | `bugbot-reviewed` + green CI |

## acceptance-orchestrator states

| State | beads | GitHub |
|-------|-------|--------|
| issue-gated | `bd ready` | acceptance criteria on issue |
| executing | `agent:session:start` | `status:in-progress` |
| review-loop | PR URL in beads comment | `agent-routed`, `bugbot-reviewed` |
| accepted | close + `beads:push` | close issue |
| escalated | blocker note | `status:agent-escalated` |

## Session integration

`agent-session-start.ps1` may pass `-CitizenId` from router output.

## GitLab adjunct

When `GITLAB_PROJECT_ID` is set, `devops-ci-champion` maps to Duo **Fix CI/CD Pipeline Flow**. GitHub issue remains SoR (`github_sor` on GitLab mirror).

See [`.cursor/bugbot/DEVOPS-AUTOFIX.md`](../../.cursor/bugbot/DEVOPS-AUTOFIX.md).
