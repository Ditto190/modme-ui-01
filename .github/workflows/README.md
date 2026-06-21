# GitHub Actions — Monorepo_ModMe

Dual-monorepo CI at repo root. Primary workflow: **`ci.yml`**.

## ci.yml

| Job | When | Steps |
|-----|------|-------|
| `secret-guard` | Always | Block tracked `.env` files |
| `changes` | Always | Path filter: `next-forge/**`, `GenerativeUI_monorepo/**` |
| `changelog` | PRs | `validate-changelog.mjs` |
| `generative-ui` | GenerativeUI paths | `yarn lint`, `test`, `build` |
| `next-forge` | next-forge paths | `bun check`, `test`, `build` |

Branches: `main`, `master`, `develop`, `dev`

## Other workflows

| Workflow | Purpose |
|----------|---------|
| `pre-commit-check.yml` | Policy + path-scoped forge/generative CI suites |
| `changelog-check.yml` | PR changelog require-update |
| `launch-json-check.yml` | VS Code launch ↔ manifest sync |
| `inbox-pipeline-check.yml` | Inbox funnel audit + orchestrator validate |
| `gitlab-mirror.yml` | Push `dev`/`main` to GitLab (requires secrets) |
| `agenttrace-ci.yml` | Session anomaly gate (`main`, `dev`) |

## Local parity

```powershell
yarn verify:forge
yarn verify:generative
yarn pre-commit:check
yarn pre-commit:check -- --full   # pre-push gate
yarn repo:doctor
```

## GitLab mirror

GenerativeUI GitLab CI: `GenerativeUI_monorepo/.gitlab-ci.yml` — mirrors root `ci.yml` generative-ui job.

See [`docs/repo-alignment.md`](../docs/repo-alignment.md).
