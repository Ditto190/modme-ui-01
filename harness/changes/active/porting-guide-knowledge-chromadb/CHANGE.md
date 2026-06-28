# porting-guide-knowledge-chromadb

> ECL structured change — PORTING_GUIDE § ChromaDB/Knowledge → inbox pipeline + Supabase

## Goal

Replace ChromaDB knowledge chunks with inbox pipeline + Supabase pgvector promote gate (`kind=knowledge_chunk`).

## Acceptance

- [ ] Molecule manifest entry: `kind=knowledge_chunk`, path `docs/inbox-pipeline`
- [ ] `packages/intake-contracts` Zod at classify/promote
- [ ] `yarn inbox:test` PASS

## Verify

```powershell
yarn inbox:test
yarn molecule-index:verify
```
