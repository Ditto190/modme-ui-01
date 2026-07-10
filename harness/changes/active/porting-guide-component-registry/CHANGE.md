# porting-guide-component-registry

> ECL structured change — PORTING_GUIDE § Component Registry → next-forge storybook + design-system

## Goal

Migrate portable Component Registry molecules to `@repo/design-system` + Storybook with molecule manifest acceptance.

## Acceptance

- [ ] Molecule manifest entry: `kind=genui_molecule`, target `apps/storybook`
- [ ] Contract test in `@repo/schemas` or storybook smoke
- [ ] ECL STATUS → complete when manifest + test pass

## Index

| Field | Value |
|-------|-------|
| PORTING_GUIDE section | Component Registry |
| molecule kind | `genui_molecule` |
| target | `next-forge/apps/storybook`, `@repo/design-system` |

## Verify

```powershell
yarn molecule-index:verify
cd next-forge && bun run test --filter storybook
```
