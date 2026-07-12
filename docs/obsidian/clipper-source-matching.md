# Clipper source matching

Why bad clips happened: HTML Obsidian Help pages matched **Code Snippet** (`SoftwareSourceCode`) or a weak Docs template → empty “source”, wrong schema. Fix: dedicated **Obsidian Help** template + trigger order + `uid` on every ModMe template.

## Rule of thumb

| URL shape | Template | Body | schema |
| --------- | -------- | ---- | ------ |
| `obsidian.md/help/*`, `help.obsidian.md/*`, `publish.obsidian.md/*` | **Obsidian Help** | Defuddle `{{content}}` | TechArticle |
| GitHub `blob` / `raw` / gist / Cubic PR | **Code Snippet** | textarea / selection fence | SoftwareSourceCode |
| `docs.*`, ReadTheDocs, GitBook, Expo docs | **Docs Site** | Defuddle | TechArticle |
| Article schema | **Article / Landing** | Defuddle | Article |
| Anything else | **Generic Link** (last) | Defuddle | — |

Never use Code Snippet for HTML help pages. Never use Defuddle `{{content}}` as the primary source for GitHub blobs.

## Clipper path (ModMe-Vault)

All ModMe (and kepano) Clipper JSON templates use vault-relative:

```json
"path": "inbox"
```

Deprecated: `GenerativeUI_monorepo/docs/inbox` (monorepo-root vault). Sidecar junction `inbox/` → real monorepo inbox.

## Trigger order (drag in Clipper UI)

1. GitHub Issue / PR  
2. Code Snippet  
3. **Obsidian Help** ← new  
4. GitHub Repo  
5. Docs Site  
6. Article / Landing  
7. AI Chat  
8. Topic templates  
9. Kepano site pack  
10. Defuddle / Interpreter probes (manual)  
11. Generic Link last  

## UID

Every ModMe Clipper template sets:

```json
{ "name": "uid", "value": "{{time|date:\"YYYYMMDDHHmm\"}}", "type": "text" }
```

Filename stays inbox-contract; `uid` enables Zettel-style linking and Advanced URI frontmatter targeting.

## Verify

1. Re-import `clipper/modme-inbox-obsidian-help.json`.
2. Clip `https://obsidian.md/help/import/zettelkasten` → research + TechArticle + content body.
3. Clip a GitHub `.py` blob → snippet + fenced python (Code Emitter runnable).

## Files

- [`modme-inbox-obsidian-help.json`](../../templates/obsidian-clipper/modme-inbox-obsidian-help.json)
- [`modme-inbox-code-snippet.json`](../../templates/obsidian-clipper/modme-inbox-code-snippet.json)
- [`templates/obsidian-clipper/README.md`](../../templates/obsidian-clipper/README.md)
