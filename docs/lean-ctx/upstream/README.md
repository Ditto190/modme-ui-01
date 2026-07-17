# lean-ctx upstream documentation corpus

Tracked snapshots and scrape targets for lean-ctx upstream docs. Used by `yarn lean-ctx:index` (`scripts/lean-ctx-universal-intake.mjs`) and the `lean-ctx-docs` task profile.

## Purpose

- Keep ModMe-specific lean-ctx guides (`docs/lean-ctx/`, `docs/lean-ctx-guide.md`) separate from upstream reference material.
- Feed `ctx_index` / knowledge export with stable, reviewable snapshots.
- Avoid bloating agent context with live web fetches during orchestration sessions.

## Layout

```
docs/lean-ctx/upstream/
  README.md                 # this file
  snapshots/                # optional committed snapshots (add as needed)
  scrape-manifest.json      # optional URL list for firecrawl/scrape pipeline
```

## Scrape instructions

1. **Manual snapshot (preferred for small pages)**

   ```powershell
   # Example: save upstream config reference
   npx --yes firecrawl-cli scrape https://leanctx.com/docs/configuration/ -o docs/lean-ctx/upstream/snapshots/configuration.md
   ```

2. **Shopping-list / scrape pipeline**

   Add URLs to `GenerativeUI_monorepo/docs/inbox/shopping-list.md` under the `lean-ctx` section, or create `docs/lean-ctx/upstream/scrape-manifest.json`:

   ```json
   {
     "urls": [
       "https://leanctx.com/docs/concepts/read-modes/",
       "https://leanctx.com/docs/configuration/"
     ]
   }
   ```

   Then run:

   ```powershell
   yarn scrape:shopping-list
   # or
   yarn lean-ctx:index --full
   ```

3. **Index into lean-ctx knowledge**

   ```powershell
   yarn lean-ctx:ensure
   yarn lean-ctx:index
   ```

## Intake paths

`scripts/lean-ctx-universal-intake.mjs` includes `docs/lean-ctx/upstream/**` in its corpus. After adding snapshots, run `yarn lean-ctx:index` (or `yarn intake:orchestrate` for full pipeline).

## Task profile

Activate the docs profile when curating upstream material:

```powershell
$env:LEAN_CTX_PROFILE = "lean-ctx-docs"
. .\scripts\load-lean-ctx-env.ps1
```

## References

- [lean-ctx GitHub](https://github.com/yvgude/lean-ctx)
- [ModMe lean-ctx guide](../../lean-ctx-guide.md)
- [Proxy and protocols](../proxy-and-protocols.md)
