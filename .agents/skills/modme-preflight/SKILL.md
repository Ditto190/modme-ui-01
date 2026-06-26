---
name: modme-preflight
description: Run ModMe pre-flight quality pipeline — env, guards, lint, test, build across next-forge and GenerativeUI. Use before PR, after major changes, or when validating CI parity locally.
---

# ModMe preflight

Single dispatcher for **lint → test → build** plus repo guards. Manifest: `scripts/preflight.manifest.json`.

## When to use

- Before opening a PR (`yarn preflight`)
- Quick smoke before dev (`yarn preflight:fast`)
- CI parity on changed stacks (`yarn preflight:ci`)
- next-forge only (`yarn preflight:forge`)
- Env wiring only (`yarn preflight:env`)

## Commands

| Command | Profile | What runs |
|---------|---------|-----------|
| `yarn preflight` | `full` | Env + guards + repo validators + forge check/test/build/boundaries + GenerativeUI verify |
| `yarn preflight:fast` | `fast` | Env + guards + script tests + forge check + test (no build) |
| `yarn preflight:ci` | `ci` | Mirrors GitHub pre-commit/CI — affected forge/generative only |
| `yarn preflight:forge` | `forge` | next-forge check + test + build + boundaries |
| `yarn preflight:generative` | `generative` | GenerativeUI lint + test + build |
| `yarn preflight:env` | `env` | Session + forge env verify |

## Options

```bash
node scripts/preflight.mjs --profile fast --skip-build
node scripts/preflight.mjs --profile full --continue --json --report
node scripts/preflight.mjs --profile tdd-red --test scripts/__tests__/foo.test.mjs
node scripts/preflight.mjs --list-profiles
```

Report artifact: `docs/devops/reports/preflight-latest.json` (gitignored) when using `--report`.

## CI alignment

- `.github/workflows/preflight-ci.yml` — preflight + artifact upload
- `.github/workflows/ci.yml` — forge/generative jobs (path-filtered)
- `.github/workflows/pre-commit-check.yml` — calls `pre-commit-checks.mjs --ci` → `preflight --profile ci`
- `yarn verify:forge` — legacy alias; prefer `yarn preflight:forge`

## Agent workflow

1. `yarn preflight:env` after env changes
2. `yarn preflight:fast` while iterating
3. `yarn preflight` before `vibe-session-finish` / PR

Related: `.agents/skills/modme-dev-setup/SKILL.md`, ADR-0010 env bootstrap.
