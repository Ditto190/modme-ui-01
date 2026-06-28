# porting-guide-schema-crawler

> ECL structured change — PORTING_GUIDE § Schema Crawler → `@repo/schemas` + molecule orchestrator

## Goal

Wire schema-crawler output into next-forge `@repo/schemas` with SemVer-tagged Zod modules and golden fixture diff gate.

## Acceptance

- [ ] Molecule manifest entry: `kind=zod_module`
- [ ] `yarn molecule-index:verify` PASS
- [ ] Golden JSON snapshot version bump documented

## Index

| Field | Value |
|-------|-------|
| PORTING_GUIDE section | Schema Crawler |
| molecule kind | `zod_module` |
| orchestrator | `scripts/molecule-index-orchestrator.mjs` |

## Verify

```powershell
yarn molecule-index --stack forge --semver 1.0.0 --dry-run
yarn molecule-index:verify
```
