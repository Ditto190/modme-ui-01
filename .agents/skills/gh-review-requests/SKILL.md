---
name: gh-review-requests
description: Fetch open PR review queue for Ditto190/modme-ui-01 (personal-repo mode). Use when asked to find PRs needing review, show review requests, or check the team review queue.
allowed-tools: Bash
risk: safe
source: community
---

# GitHub Review Requests (ModMe)

Fetch open pull requests needing review for **Ditto190/modme-ui-01**. Personal-account mode — no org team filter.

**Requires**: GitHub CLI (`gh`) authenticated.

## When to Use

- Find open PRs on base `dev` needing review
- Check unread `review_requested` notifications
- Build a filtered review queue instead of browsing GitHub manually

## Step 1: Run the script

From repo root:

```bash
yarn pr:queue
# or
node scripts/pr-triage/fetch-review-queue.mjs --repo Ditto190/modme-ui-01 --base dev
```

Options:

| Flag | Default | Purpose |
|------|---------|---------|
| `--repo` | `Ditto190/modme-ui-01` | Target repository |
| `--base` | `dev` | Filter by base branch |
| `--author` | — | Filter by PR author login |
| `--markdown` | — | Table output instead of JSON |

## Step 2: Present results

| # | Title | URL | Reason |
|---|-------|-----|--------|
| 1 | feat(workflow): speckit gates | https://github.com/Ditto190/modme-ui-01/pull/91 | review required |

If `total` is 0: "No open PRs found for that filter."

## Full triage pipeline

```bash
yarn pr:triage          # queue + classify + comments + report
yarn pr:comments --pr 91  # actionable comment summary for one PR
yarn pr:classify --base main  # stale main-targeting classification
```

Reports: `docs/pr-resolution/reports/triage-YYYY-MM-DD.{json,md}`

## Fallback (no script)

```bash
gh pr list --repo Ditto190/modme-ui-01 --base dev --state open
gh api notifications --paginate
```

## Limitations

- Ditto190 is a user account — org team APIs are unavailable; use `--author` or `--base` instead.
- Does not auto-merge; use `yarn pr:triage` recommendation mode first.
