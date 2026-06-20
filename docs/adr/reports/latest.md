# ADR Error Report

Generated: 2026-06-20T08:17:39.631Z
Source: `validate-adrs`
Status: **PASS**

## Summary

| Metric | Count |
|--------|-------|
| Files with findings | 0 |
| Errors | 0 |
| Warnings | 0 |
| Automatable | 0 |

## Automation

```powershell
yarn adr:audit              # full audit + this report
yarn adr:fix --dry-run      # preview safe fixes from latest report
yarn adr:fix --apply        # apply safe fixes
yarn adr:validate           # re-run validation
```

_No findings._
