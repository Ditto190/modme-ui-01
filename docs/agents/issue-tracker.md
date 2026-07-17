# Issue tracker: GitHub

Issues and PRDs for this repo live as **GitHub issues** on the canonical remote [`Ditto190/modme-ui-01`](https://github.com/Ditto190/modme-ui-01). Use the `gh` CLI for all operations.

> **Note:** `git remote origin` may point at GitLab (`modifyme-catalogue`). Always pass `--repo Ditto190/modme-ui-01` when `gh` is run outside a GitHub-default clone, or set `GH_REPO=Ditto190/modme-ui-01`.

## Conventions

- **Create an issue**: `gh issue create --repo Ditto190/modme-ui-01 --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --repo Ditto190/modme-ui-01 --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --repo Ditto190/modme-ui-01 --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --repo Ditto190/modme-ui-01 --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --repo Ditto190/modme-ui-01 --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --repo Ditto190/modme-ui-01 --comment "..."`

## Pull requests as a triage surface

**PRs as a request surface: no.** External PRs are not pulled into the matt-pocock triage queue by default.

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --repo Ditto190/modme-ui-01 --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --repo Ditto190/modme-ui-01 --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## Beads (multi-session agent tasks)

Git-backed task memory complements GitHub issues for agent epics and dependencies. Prefix: **`modme`**. Guide: [`docs/beads-workflow.md`](../beads-workflow.md).

```powershell
yarn beads:ready
npx @beads/bd create "title" --type epic
npx @beads/bd create "child" --parent <epic-id>
```

## When a skill says "publish to the issue tracker"

Create a GitHub issue on `Ditto190/modme-ui-01` (or a beads issue for multi-session agent work).

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo Ditto190/modme-ui-01 --comments`, or `npx @beads/bd show <modme-id>` for beads tasks.
