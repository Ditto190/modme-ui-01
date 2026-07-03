# porting-guide-genai-toolbox

> ECL structured change — PORTING_GUIDE § GenAI Toolbox → legacy `agent/` archive satellite

## Goal

Document GenAI Toolbox as `legacy_satellite` molecule; archive path in phase-4 cutover without blocking forge migration.

## Acceptance

- [ ] Molecule manifest entry: `kind=legacy_satellite`, id `genai_toolbox`
- [ ] Referenced in `docs/migration/legacy-archive-plan.md`
- [ ] No new forge deps on legacy agent tree

## Verify

```powershell
yarn molecule-index --stack legacy-root --dry-run
```
