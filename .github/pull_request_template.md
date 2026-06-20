# Pull Request

## Summary

<!-- One sentence: what does this PR do? -->

## Intent & Scope

<!-- What problem is being solved? For whom? What is explicitly OUT of scope? -->

**Problem:**

**Audience / affected area:**

**Out of scope:**

## Changes

<!-- Bullet list of concrete changes. Link to relevant files where helpful. -->

- 

## Validation

<!-- How was this tested or verified? Attach screenshots / logs if applicable. -->

- [ ] Local build/lint passes (`npm run lint` / `npm run build`)
- [ ] Agent health verified (`curl http://localhost:8000/health`)
- [ ] New components registered in `ALLOWED_TYPES` and `renderElement` switch (if UI change)
- [ ] Secrets not introduced into source or git history
- [ ] CI checks pass on this branch

**Steps to reproduce / verify:**

```
1.
2.
3.
```

## awesome-copilot Reuse

<!-- REQUIRED: Which prompts, skills, checklists, or subagent instructions from
awesome-copilot (Ditto190/awesome-copilot) or agents/ were used?
If none, briefly explain why. -->

- **Prompts used:** <!-- e.g. agents/prompts/pr-review.md, or "none - no matching asset found" -->
- **Skills used:** <!-- e.g. agents/skills/ci-validation.md, or "none" -->
- **Checklists used:** <!-- e.g. agents/review/code-review-rubric.md -->
- **Index version consulted:** <!-- check vendor/awesome-copilot-index/manifest.json -->

## Risks & Tradeoffs

<!-- Anything a reviewer should watch for: security, performance, breaking changes, debt. -->

| Risk | Severity | Mitigation |
|------|----------|------------|
|      |          |            |

## Notes for Reviewers (Humans & Agents)

<!-- Any context that helps reviewers: unusual decisions, follow-up issues, areas of uncertainty. -->

> **Agents:** Read `AGENTS.md` and `agents/review/code-review-rubric.md` before reviewing.
> Flag issues as: `BLOCKER` / `NON-BLOCKER` / `SUGGESTION`.
