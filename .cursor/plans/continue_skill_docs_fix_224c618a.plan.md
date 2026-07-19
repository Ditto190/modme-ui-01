---
name: Continue Skill Docs Fix
overview: "Finish the interrupted follow-up: wire Aspect rules_js getting-started docs into the TypeScript skill references (re-extract from the local tarball), and commit the no-subagent continual-learning skill + AGENTS.md preference on a focused PR separate from the Obsidian pack."
todos:
  - id: vendor-rules-js
    content: Extract rules_js docs/README.md from Downloads tarball into typescript-best-practices/references and link from SKILL.md
    status: pending
  - id: branch-commit-pr
    content: New branch feature/cursor/continual-learning-no-subagent; commit skill+AGENTS+rules_js ref; push PR to dev
    status: pending
  - id: isolate-obsidian-pr
    content: "Keep Obsidian PR #104 free of continual-learning/TS reference commits"
    status: pending
isProject: false
---

# Continue: rules_js reference + continual-learning commit

## Context (where we stopped)

- Continual-learning rewritten (no `agents-memory-updater`) in [`.cursor/skills/continual-learning/SKILL.md`](.cursor/skills/continual-learning/SKILL.md); preference added in [`AGENTS.md`](AGENTS.md). Both are **modified, uncommitted** on `feature/cursor/obsidian-unique-note-pack`.
- In-repo TypeScript patterns already exist: [`.cursor/skills/typescript-best-practices/references/patterns.md`](.cursor/skills/typescript-best-practices/references/patterns.md) (linked from the skill).
- Temp extract of rules_js docs is **gone** (`…Temp…/rules_js-1.34.0/docs/README.md` = missing). Source tarball remains: `C:\Users\dylan\My Drive\Downloads\rules_js-v1.34.0.tar.gz`.

## Locked decisions

- Vendor only the rules_js **Getting Started** README (not the whole docs tree) into the TypeScript skill `references/` folder.
- Land continual-learning + AGENTS + rules_js reference on a **new** branch/PR to `dev` (do not pile onto Obsidian PR #104).

## Implementation

1. **Extract + vendor rules_js README**
   - From the Downloads tarball, extract `rules_js-*/docs/README.md` only.
   - Save as [`.cursor/skills/typescript-best-practices/references/rules_js-getting-started.md`](.cursor/skills/typescript-best-practices/references/rules_js-getting-started.md).
   - Add a one-line pointer at the bottom of [`SKILL.md`](.cursor/skills/typescript-best-practices/SKILL.md): `Bazel/npm (rules_js): references/rules_js-getting-started.md` next to the existing `patterns.md` link.
   - Do not commit the `.tar.gz` or expand the full Aspect docs set.

2. **Commit continual-learning fix separately**
   - Branch: `feature/cursor/continual-learning-no-subagent` from current `dev` / `github/dev` tip (cherry-pick or re-apply the two file diffs if needed).
   - Include:
     - `.cursor/skills/continual-learning/SKILL.md`
     - `AGENTS.md` preference bullet forbidding memory-updater subagents
     - TypeScript skill `references/rules_js-getting-started.md` + SKILL.md link
   - Conventional commit message, e.g. `fix(skills): ban continual-learning subagent; vendor rules_js getting-started`.
   - Push to `github` and open PR → `dev`.

3. **Leave Obsidian PR alone**
   - Keep [#104](https://github.com/Ditto190/modme-ui-01/pull/104) scoped to the Obsidian pack; reset or leave the continual-learning dirty files off that branch when switching (checkout new branch without carrying unrelated dirty work, or `git restore` those paths on the Obsidian branch after copying).

## Verification

- Open `patterns.md` and `rules_js-getting-started.md` from the TypeScript skill.
- Confirm continual-learning SKILL still forbids `agents-memory-updater`.
- `gh pr view` new PR targets `dev`.
