# Polis-style routing (lightweight)

ModMe uses **citizen cards** in [`data/agent-citizens/`](../../data/agent-citizens/) instead of a full `_polis/` scaffold.

## Router

```bash
node scripts/lib/polis-router.mjs --labels ci-cd,devops-autofix --self-heal
node scripts/lib/polis-router.mjs --all --labels review:forge,stack:forge
```

API: [`scripts/lib/polis-router.mjs`](../../scripts/lib/polis-router.mjs)

```javascript
import { routeContract, routeContracts } from "./scripts/lib/polis-router.mjs";

const route = routeContract({
  labels: ["ci-cd", "devops-autofix"],
  changedPaths: [".github/workflows/ci.yml"],
  selfHeal: "Yes",
  beadsId: "modme-aqu",
  pipelineSuccess: false,
});
// → { citizenId, skills, verifyCommands, gitlabFlow, maxRounds }

const all = routeContracts({
  labels: ["review:forge", "review:generative"],
  changedPaths: ["next-forge/x.ts", "GenerativeUI_monorepo/y.ts"],
});
// → [{ citizenId, skills, ..., score }, ...]  // GitLab multi-rule parity
```

## Citizens

| ID                      | When                                             |
| ----------------------- | ------------------------------------------------ |
| `devops-ci-champion`    | `ci-cd` / `review:devops` / `.github/**`         |
| `forge-reviewer`        | `next-forge/**` / `review:forge`                 |
| `generative-reviewer`   | `GenerativeUI_monorepo/**` / `review:generative` |
| `security-reviewer`     | auth/supabase / `review:security`                |
| `docs-reviewer`         | docs / `review:docs`                             |
| `bugbot-merge-champion` | `bugbot-reviewed` / `review:merge` + green CI    |

Path→role SoT: [`.github/agent-codeowners.yml`](../../.github/agent-codeowners.yml). Runbook: [`docs/devops/agent-review-routing.md`](../devops/agent-review-routing.md).

## acceptance-orchestrator states

| State       | beads                   | GitHub                            |
| ----------- | ----------------------- | --------------------------------- |
| issue-gated | `bd ready`              | acceptance criteria on issue      |
| executing   | `agent:session:start`   | `status:in-progress`              |
| review-loop | PR URL in beads comment | `agent-routed`, `bugbot-reviewed` |
| accepted    | close + `beads:push`    | close issue                       |
| escalated   | blocker note            | `status:agent-escalated`          |

## Session integration

`agent-session-start.ps1` may pass `-CitizenId` from router output.

## GitLab adjunct

When `GITLAB_PROJECT_ID` is set, `devops-ci-champion` maps to Duo **Fix CI/CD Pipeline Flow**. GitHub issue remains SoR (`github_sor` on GitLab mirror).

See [`.cursor/bugbot/DEVOPS-AUTOFIX.md`](../../.cursor/bugbot/DEVOPS-AUTOFIX.md).
