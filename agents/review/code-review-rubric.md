# Agent & Human Code-Review Rubric

> **Usage:** Apply this checklist during every code review, whether you are a human reviewer or an
> AI agent (Copilot, Claude, Cursor, etc.). Reference `AGENTS.md` for repo-level conventions.
>
> **Severity labels:** `BLOCKER` — must fix before merge | `NON-BLOCKER` — should fix soon |
> `SUGGESTION` — optional improvement.

---

## 1. Correctness

> Does the change do what it claims, and only what it claims?

- [ ] The implementation matches the stated intent and scope in the PR description.
- [ ] Edge cases are handled (empty inputs, null/undefined, network failures, large payloads).
- [ ] No off-by-one errors, type coercions, or silent failures.
- [ ] State mutations are intentional and scoped (Python agent writes `tool_context.state`; React never writes back).
- [ ] All `ALLOWED_TYPES` in `agent/main.py` have a matching `case` in the `renderElement` switch.

---

## 2. Clarity & Maintainability

> Will the next developer (human or agent) understand this code without your help?

- [ ] Names (variables, functions, components, IDs) are descriptive and follow repo conventions
  (`snake_case` for IDs, `PascalCase` for component types, `camelCase` for props).
- [ ] Functions and components are small and focused on a single responsibility.
- [ ] No unnecessary duplication — shared logic is extracted or reused from `agents/skills/` or
  `src/lib/`.
- [ ] Complex logic has a brief explanatory comment (matching the style of existing comments).
- [ ] Temporary / debug code (console.log, TODO, hardcoded credentials) is absent.

---

## 3. Tests & Validation

> Is important behavior covered?

- [ ] New tools or components have at least one test or validation path (unit or integration).
- [ ] Existing tests are not deleted or weakened to make the change pass.
- [ ] CI checks (`npm run lint`, `npm run build`, `pytest`) are expected to pass.
- [ ] Manual validation steps are documented in the PR (screenshots or `curl` output where relevant).

---

## 4. Safety & Security

> Could this change introduce risk?

- [ ] No secrets, API keys, or tokens are introduced into source code or git history.
- [ ] All user/agent inputs are validated before use (Zod for TypeScript props; explicit checks in
  Python tools).
- [ ] No new external dependencies are introduced without an advisory check
  (`gh-advisory-database` or equivalent).
- [ ] Pinned dependency versions are used where security matters.
- [ ] HTTP endpoints do not leak internal state or stack traces to clients.

---

## 5. Reuse & Conventions

> Does the change align with established patterns and avoid reinvention?

- [ ] Existing utilities in `src/lib/`, `agent/tools/`, or `agents/` were checked before adding
  new ones.
- [ ] `awesome-copilot` index was consulted for matching prompts/skills/checklists
  (see `vendor/awesome-copilot-index/` or `agents/index.json`).
- [ ] The PR template's "awesome-copilot Reuse" section is filled in (not left blank).
- [ ] New reusable patterns are proposed for upstreaming to `Ditto190/awesome-copilot` or added
  to `agents/`.

---

## 6. Documentation & Agent Alignment

> Are docs, instructions, and agent guidance kept in sync?

- [ ] If behaviour or public interfaces changed, `README.md` and/or relevant `*.md` in `docs/`
  are updated.
- [ ] If new component types were added, `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`
  reference them.
- [ ] If new agent tools were added, `CODEBASE_INDEX.md` and `agent/toolsets.json` are updated.
- [ ] If conventions changed, this rubric (`agents/review/code-review-rubric.md`) should be
  updated accordingly.

---

## Quick Severity Guide (for review comments)

| Label | Meaning |
|-------|---------|
| `BLOCKER` | Must be resolved before merge. Correctness, security, or data-loss risk. |
| `NON-BLOCKER` | Should be addressed in a follow-up issue. Maintainability or test gap. |
| `SUGGESTION` | Optional improvement. Style, naming, or alternative approach. |

---

*This rubric is maintained in `agents/review/code-review-rubric.md`.
It is indexed in `agents/index.json` and referenced by the Copilot Pre-Review Gate workflow.*
