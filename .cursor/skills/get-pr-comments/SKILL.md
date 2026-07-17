---
name: get-pr-comments
description: Fetch and summarize review comments from the active pull request
---

# Get PR comments

## Trigger

Need a concise, actionable summary of feedback on the active pull request.

## Workflow

1. Resolve the active PR for the current branch (`gh pr view`) or pass `--pr <number>`.
2. Run `yarn pr:comments --pr <n>` (or `node scripts/pr-triage/aggregate-pr-comments.mjs`).
3. Script fetches inline review + discussion comments via `gh api`.
4. Groups by severity (high/medium/low) from bot markers.
5. Return prioritized action list.

## Commands

```bash
yarn pr:comments --pr 91
yarn pr:comments --pr 91 --markdown
yarn pr:triage   # full pipeline + report in docs/pr-resolution/reports/
```

## Output

- Grouped feedback summary
- Action list ordered by priority
- Open questions that still need clarification