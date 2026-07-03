# porting-guide-toolset-management

> ECL structured change — PORTING_GUIDE § Toolset Management → `scripts/toolset-management/`

## Goal

Index toolset graph entries as `toolset_entry` molecules with validation scripts standalone from agent runtime.

## Acceptance

- [ ] Molecule manifest entries for each toolset-management script/json
- [ ] `yarn validate:toolsets` or equivalent passes
- [ ] No cross-monorepo workspace deps

## Verify

```powershell
yarn molecule-index --stack legacy-root --dry-run
yarn molecule-index:verify
```
