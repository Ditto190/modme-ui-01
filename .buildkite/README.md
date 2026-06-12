# Buildkite pipeline — Monorepo_ModMe

CI for **`GenerativeUI_monorepo/`** (Yarn 3 + Turbo), adapted from [buildkite/starter-pipeline-example](https://github.com/buildkite/starter-pipeline-example).

## Quick start

1. Sign up at [buildkite.com](https://buildkite.com) (free tier includes hosted agents).
2. **Pipelines → New pipeline → Connect repository** (this GitHub repo).
3. When prompted for pipeline steps, use the upload command from [template.yml](./template.yml):

   ```bash
   buildkite-agent pipeline upload
   ```

   Or paste the contents of [pipeline.yml](./pipeline.yml) if your setup does not auto-upload `.buildkite/`.

4. Push a commit — Buildkite runs the pipeline on hosted Linux agents.

[![Add to Buildkite](https://buildkite.com/button.svg)](https://buildkite.com/new)

## What runs

| Step | Command (via scripts) | Same as GitHub Actions? |
|------|------------------------|-------------------------|
| Secret guard | Block tracked `.env` files | Yes |
| Install | `yarn install` in `GenerativeUI_monorepo` | Yes |
| Lint + Test | Parallel after install | Yes (`yarn lint`, `yarn test`) |
| Build | `yarn build` | Yes |

## Local demo (no Buildkite account)

```powershell
.\scripts\buildkite-demo.ps1
```

Interactive UI: start web-dashboard and open `/dev/buildkite`.

## Files

- `pipeline.yml` — step graph and dependencies
- `template.yml` — metadata for “Add to Buildkite”
- `scripts/` — shell helpers (agents run bash on Linux)

See [docs/buildkite-guide.md](../docs/buildkite-guide.md) for how Buildkite fits next to GitHub Actions and Cursor MCP.
