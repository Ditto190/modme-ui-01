---
name: awesome-cursor-skills
description: Browse and install Cursor-native skills from spencerpauly/awesome-cursor-skills. Use for visual QA, browser verification, PR workflow, port conflicts, cursor rules/hooks suggestions, and parallel agent patterns.
---

# Awesome Cursor Skills

Curated catalog: [spencerpauly/awesome-cursor-skills](https://github.com/spencerpauly/awesome-cursor-skills)

Vendored copy: `.vendor/awesome-cursor-skills-main/resources/`

## Install (recommended)

From repo root:

```powershell
.\scripts\cursor-ai\setup.ps1
```

Installs a curated global set into `~/.cursor/skills/` (manual copy from vendor; `npx skills` when Git is on PATH).

## Install a specific skill

```bash
npx skills add spencerpauly/awesome-cursor-skills@<skill-name> --agent cursor -g -y
```

Examples:

```bash
npx skills find cursor browser
npx skills add spencerpauly/awesome-cursor-skills@verifying-in-browser --agent cursor -g -y
npx skills add spencerpauly/awesome-cursor-skills@suggesting-cursor-rules --agent cursor -g -y
npx skills add spencerpauly/awesome-cursor-skills@detecting-port-conflicts --agent cursor -g -y
```

## Cursor-native highlights

| Skill | Use when |
|-------|----------|
| `visual-qa-testing` | Screenshot + console/network audit after UI changes |
| `verifying-in-browser` | Dev server + side-by-side browser verification |
| `finding-dev-server-url` | Scan terminals for running dev URLs |
| `detecting-port-conflicts` | `EADDRINUSE` during debug (see `docs/debug-launch-guide.md`) |
| `suggesting-cursor-rules` | Encode repeated conventions into `.cursor/rules/` |
| `suggesting-cursor-hooks` | Automate lint/test checks via `.cursor/hooks.json` |
| `creating-pr` | Review-ready PRs with conventional titles |
| `grinding-until-pass` | Fix until tests/build/lint pass |
| `parallel-exploring` | Fast codebase exploration with subagents |
| `best-of-n-solving` | Parallel worktree experiments |

## Paths

| Scope | Path |
|-------|------|
| Global | `~/.cursor/skills/` |
| Project | `.cursor/skills/` |
| Vendor source | `.vendor/awesome-cursor-skills-main/resources/<skill>/` |

## Notes

- Catalog is links + `SKILL.md` files — not a single npm package.
- Review skills before production use.
- Refresh vendor: delete `.vendor/awesome-cursor-skills-main` and re-run `setup.ps1`.
