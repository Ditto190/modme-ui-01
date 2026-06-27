# Issue Promotion Template

Use when converting a review finding, beads task, or spec gap into a trackable GitHub issue (system-of-record).

Fork workflow: [gen-specs-as-issues.prompt.md](../../agent-library/prompts/gen-specs-as-issues.prompt.md)

## Title

`[stack:<forge|generative|root|orchestration>] <type>: <short description>`

## Body template

```markdown
## Summary

One sentence: what needs to be done.

## Stack

- [ ] stack:forge
- [ ] stack:generative
- [ ] stack:root
- [ ] stack:orchestration

## Beads (optional)

- **beads_issue_id:** modme-xxxx
- **session_envelope:** logs/agent-orchestrator/sessions/<uuid>.json

## Problem / gap

What is broken or missing? Link to PR review comment or failing CI job if applicable.

## Acceptance criteria (DoD)

- [ ] Criterion 1 (testable)
- [ ] Criterion 2
- [ ] Verification command passes: `yarn verify:forge` | `yarn verify:generative` | `yarn pre-commit:check`

## Verify commands

```bash
# paste exact commands agents must run before closing
```

## Out of scope

What this issue explicitly does NOT include.

## Agent routing (optional)

- **citizen:** devops-ci-champion | forge-reviewer | generative-reviewer | beads-orchestrator
- **gitlab_adjunct:** (URL if mirrored for Duo autofix)

## References

- PR: #
- CI run: 
- Related issues: #
```

## Default labels

| Type | Labels |
|------|--------|
| Bug | `bug`, `needs-triage`, `stack:*` |
| CI/DevOps | `ci-cd`, `devops-autofix`, `needs-triage` |
| Feature | `enhancement`, `needs-triage` |
| beads handoff | `beads-linked`, `agent:beads` |
