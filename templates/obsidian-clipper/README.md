# Obsidian Web Clipper → ModMe Inbox

Importable JSON templates for the [Obsidian Web Clipper](https://obsidian.md/clipper) Chrome extension. Prefer vault **ModMe-Vault** (sidecar): template `"path": "inbox"` writes through the junction to `GenerativeUI_monorepo/docs/inbox/` with frontmatter matching [`docs/inbox-pipeline/contracts/inbox-contract.v1.json`](../../docs/inbox-pipeline/contracts/inbox-contract.v1.json). Every ModMe template also sets `uid: YYYYMMDDHHmm` (Zettel UID) without changing the inbox filename contract.

Official docs: [Templates](https://help.obsidian.md/web-clipper/templates) · [Variables](https://help.obsidian.md/web-clipper/variables) · [Filters](https://help.obsidian.md/web-clipper/filters) · [Logic](https://help.obsidian.md/web-clipper/logic) · ModMe pack: [`docs/obsidian/`](../../docs/obsidian/)

## Why nothing appeared in Inbox

Two common causes:

1. **No Obsidian vault** — this repo had no `.obsidian/` folder, so Clipper could not target `Monorepo_ModMe`. Fixed: vault config is now at [`.obsidian/`](../../.obsidian/). Open the **repo root** as a vault (see [`ModMe Vault.md`](../../ModMe%20Vault.md)).
2. **IDE hides gitignored files** — `GenerativeUI_monorepo/docs/inbox/*` is gitignored (except README / `_index.json`). Cursor/VS Code may hide new clips. Check on disk:

```powershell
Get-ChildItem GenerativeUI_monorepo\docs\inbox -File | Sort-Object LastWriteTime -Descending | Select-Object -First 10
```

To commit a clip for the ingest pipeline: `git add -f GenerativeUI_monorepo/docs/inbox/<file>.md`

## One-time setup

```powershell
yarn obsidian:sidecar:setup -OpenVault
# Deprecated monorepo-root vault: .\scripts\setup-obsidian-vault.ps1
```

1. Install [Obsidian](https://obsidian.md/download) and [Web Clipper](https://obsidian.md/clipper).
2. Obsidian → **Open folder as vault** → `C:\Users\dylan\ModMe-Vault` (sidecar).
3. Clipper extension → Settings → select vault **ModMe-Vault** · default folder `inbox`.
4. Import templates from vault `clipper/` (below). Re-import after template updates.
5. Clip a test page → confirm a new `.md` under `ModMe-Vault/inbox/` (same files as `GenerativeUI_monorepo/docs/inbox/`).

## Import templates

1. Open the Clipper extension → **Settings** (cog).
2. Click **Import** or drag-and-drop `.json` files into the template area.

### Starter pack (ModMe inbox-contract)

| File                                                                   | When it auto-selects                                       | `type`     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| [`modme-inbox-github-issue-pr.json`](modme-inbox-github-issue-pr.json) | `github.com/.../(issues\|pull)/N`                          | `research` |
| [`modme-inbox-code-snippet.json`](modme-inbox-code-snippet.json)       | GitHub `blob`/`raw`/gist, Cubic PR file views              | `snippet`  |
| [`modme-inbox-obsidian-help.json`](modme-inbox-obsidian-help.json)     | `obsidian.md/help`, `help.obsidian.md`, `publish.obsidian.md` (TechArticle HTML) | `research` |
| [`modme-inbox-github-repo.json`](modme-inbox-github-repo.json)         | GitHub repo home URL                                       | `research` |
| [`modme-inbox-docs-site.json`](modme-inbox-docs-site.json)             | `docs.*`, Expo, TechArticle, etc.                          | `research` |
| [`modme-inbox-article-landing.json`](modme-inbox-article-landing.json) | `schema:@Article` / NewsArticle / BlogPosting              | `research` |
| [`chatgpt-clipper.json`](chatgpt-clipper.json)                         | ChatGPT, Claude, Gemini, Perplexity, Grok, Copilot, Cursor | `research` |
| [`modme-inbox-defuddle-probe.json`](modme-inbox-defuddle-probe.json)   | Manual — Defuddle `{{content}}` vs `fullHtml` diagnostic   | `research` |
| [`modme-inbox-interpreter-ollama.json`](modme-inbox-interpreter-ollama.json) | Manual — Ollama llama3.2 summary/tags/severity          | `research` |
| [`modme-inbox-generic-link.json`](modme-inbox-generic-link.json)       | Manual / fallback (no triggers)                            | `link`     |

Topic templates (optional): `agent-gateway-research.json`, `expo-cng-research.json`, `dolt-cms-catalog-research.json`, `copilot-workspace-config.json`, `multi-agent-orchestration-adr.json`.

### Kepano pack ([kepano/clipper-templates](https://github.com/kepano/clipper-templates))

All upstream templates live in [`kepano/`](kepano/) with `path` set to vault-relative `inbox` (ModMe-Vault):

`arxiv`, `chatgpt` (upstream), `goodreads`, `google-maps`, `imdb`, `imdb-reference`, `letterboxd`, `product`, `recipes`, `redfin`, `wikipedia`, `youtube`.

Prefer ModMe [`chatgpt-clipper.json`](chatgpt-clipper.json) for AI chats (multi-agent + inbox frontmatter). Use `kepano/chatgpt-clipper.json` only if you want the stock ChatGPT-only selector.

## Template order (important)

Clipper uses the **first matching** template. Drag to this order:

1. GitHub Issue / PR
2. **Code Snippet** (blob / raw / gist / Cubic — before bare repo home)
3. **Obsidian Help** (HTML help / Advanced URI Publish — never SoftwareSourceCode)
4. GitHub Repo
5. Docs Site
6. Article / Landing
7. AI Chat (multi-agent)
8. Topic templates (if imported)
9. Kepano site-specific (Wikipedia, YouTube, …)
10. **Defuddle Probe** / **Interpreter Ollama Probe** (manual; above Generic Link)
11. **Generic Link** last

See also [`docs/obsidian/clipper-source-matching.md`](../../docs/obsidian/clipper-source-matching.md).

### Defuddle vs Copy-as-MD vs Interpreter

| Piece | What it does | LLM? |
| ----- | ------------ | ---- |
| **[Defuddle](https://github.com/kepano/defuddle)** | Strips page chrome; main article → Markdown. Powers Clipper `{{content}}`, `{{title}}`, `{{author}}`, `{{words}}`, etc. | No |
| **Copy as MD** | Same extraction: Clipper note body / Reader / [defuddle.md](https://defuddle.md/) API / bookmarklets — not a separate template variable | No |
| **[Interpreter](https://help.obsidian.md/web-clipper/interpreter)** | Prompt vars `{{"..."}}`; click **Interpret** before save. Template `"context"` should be trimmed Defuddle MD (not full HTML) | Yes — **Ollama only** in this pack |

**Defuddle probe** ([`modme-inbox-defuddle-probe.json`](modme-inbox-defuddle-probe.json)): dumps Defuddle metadata + `{{content}}` vs truncated `{{fullHtml}}`. No prompts.

**Interpreter probe** ([`modme-inbox-interpreter-ollama.json`](modme-inbox-interpreter-ollama.json)): `"context": "{{content|slice:0,1500}}"`, prompts for `summary` / `tags` / `severity`. Complements post-ingest MDA — does **not** replace it. Skip Interpreter on code-snippet / selector-heavy templates.

#### Ollama + llama3.2 (Windows)

1. Install [Ollama](https://ollama.com/), then `ollama pull llama3.2`.
2. Close the Ollama app tray process. Start the server with extension origins (else Chrome gets **403**):

```powershell
$env:OLLAMA_ORIGINS = "moz-extension://*,chrome-extension://*,safari-web-extension://*"
ollama serve
```

3. Clipper → Settings → Interpreter → Enable → Add provider **Ollama** (no API key) → Add model: Display name `Llama 3.2`, Model ID **`llama3.2`**.
4. Select **ModMe Inbox — Interpreter Ollama Probe** → click **Interpret** → **Add to Obsidian**.

Default Ollama `num_ctx` is **2048**. Long pages fail silently — keep template context sliced (this probe uses 1500 chars of Defuddle MD) or raise `num_ctx` carefully.

#### CLI / API smoke (no browser)

```powershell
yarn defuddle:smoke
yarn defuddle:smoke -- https://stephango.com/saw
```

Runs `npx defuddle parse <url> --json` and fetches `https://defuddle.md/<host/path>`, then writes a compare note under `GenerativeUI_monorepo/docs/inbox/`. See [`scripts/defuddle-smoke.mjs`](../../scripts/defuddle-smoke.mjs) and [`GenerativeUI_monorepo/docs/inbox/web-clipper/defuddle-interpreter-ollama.md`](../../GenerativeUI_monorepo/docs/inbox/web-clipper/defuddle-interpreter-ollama.md).

### Code snippet / AST-ready capture

[`modme-inbox-code-snippet.json`](modme-inbox-code-snippet.json) stores a **SoftwareSourceCode** envelope (`file_extension`, `programming_language`, `encoding_format`, fenced source). It does **not** run an AST in the browser.

- Clipper note → inbox `type: snippet` for ingest / embeddings
- Real AST chunks → later via [`docs/inbox-pipeline/contracts/code-chunk.v1.json`](../../docs/inbox-pipeline/contracts/code-chunk.v1.json) / code-index
- **GitHub blob source:** reads `#read-only-cursor-text-area` / `textarea[aria-label="file content"]` (full file text). Do **not** use Defuddle `{{content}}` — it captures page chrome. Visible `.react-code-line-contents` is virtualized (incomplete).
- If Source is empty: wait for the viewer to load, open **Raw** (`/blob/` → `/raw/`), or select code before clipping. Re-import the JSON after updates.
- Cubic PR views: prefer **selecting a diff hunk** before clip; file headers use `data-testid^=pr-v2-file-header-row-` when present

## What gets written

- **Path:** `GenerativeUI_monorepo/docs/inbox`
- **Filename:** `YYYY-MM-DDTHH-mm-ss_{type}_{role}_{title}.md`
- **Required frontmatter:** `timestamp`, `agent`, `type` (plus `agent_role`, `severity`, `tags`, `title`, `summary`, `source`)

Browser clips default to `agent: human` / `agent_role: researcher`, except AI Chat which sets `agent` from the chat domain (`chatgpt`, `claude`, `gemini`, …).

Frontmatter is set only via Clipper **properties** (not a second `---` block in the note body).

## After clipping

```powershell
Get-ChildItem GenerativeUI_monorepo\docs\inbox -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5
yarn inbox:audit:funnel
git add -f GenerativeUI_monorepo/docs/inbox/<your-clip>.md
```

## Selector notes (verified 2026-07-10)

| Template        | Verified sources                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Repo     | `meta:octolytics-dimension-user_login`, `#repo-stars-counter-star`, `og:*`, `<article>` README                                    |
| GitHub Issue/PR | `.js-comment-body`, `.markdown-body`, `og:title` / description                                                                    |
| Obsidian Help   | URL triggers on `obsidian.md/help`, `help.obsidian.md`, `publish.obsidian.md`; body Defuddle `{{content}}`; `schema_type` TechArticle (2026-07-12) |
| Docs            | `schema:@TechArticle` (Expo), `meta:description`, `og:*` (Obsidian Help hosts deferred to Obsidian Help template)                 |
| Article         | `schema:@Article` (Wikipedia), `og:*`, `{{content}}`                                                                              |
| AI Chat         | ChatGPT: `article[data-testid*="conversation-turn"]`; others: `{{content}}`                                                       |
| Code Snippet    | GitHub blob (verified 2026-07-11): `#read-only-cursor-text-area`, `textarea[aria-label="file content"]`, `a[data-testid="raw-button"]`; not Defuddle `content`; Cubic: selection + file-header testids |
| Generic         | Preset vars only (`title`, `url`, `description`, `content`)                                                                       |

## Vault + IDE

- Prefer sidecar: [`OBSIDIAN_SIDECAR_QUICK_START.md`](../../OBSIDIAN_SIDECAR_QUICK_START.md) · [`docs/obsidian/`](../../docs/obsidian/)
- Vault home (legacy monorepo): [`ModMe Vault.md`](../../ModMe%20Vault.md)
- Sidecar setup: [`scripts/setup-modme-obsidian-sidecar.ps1`](../../scripts/setup-modme-obsidian-sidecar.ps1)
- In-app note templates: [`templates/obsidian-note-templates/`](../obsidian-note-templates/) (`tpl-unique-note`, `tpl-code-sandbox`)
- Inspired by [kepano/kepano-obsidian](https://github.com/kepano/kepano-obsidian) core plugins (daily notes, templates, bases, properties) without importing that vault’s personal notes into the monorepo.

## References

- Community templates: [obsidian-community/web-clipper-templates](https://github.com/obsidian-community/web-clipper-templates)
- Kepano examples: [kepano/clipper-templates](https://github.com/kepano/clipper-templates)
- Inbox funnel guide: [`GenerativeUI_monorepo/docs/inbox/README.md`](../../GenerativeUI_monorepo/docs/inbox/README.md)
- Defuddle + Interpreter (Ollama): [`GenerativeUI_monorepo/docs/inbox/web-clipper/defuddle-interpreter-ollama.md`](../../GenerativeUI_monorepo/docs/inbox/web-clipper/defuddle-interpreter-ollama.md)
- Pipeline overview: [`docs/inbox-pipeline/README.md`](../../docs/inbox-pipeline/README.md)

---

# Using JSON-schema

[link][https://obsidian.md/help/web-clipper/variables#Schema.org+variables]

Schema.org variables
Schema variables allow you to extract data from schema.org JSON-LD on the page. Schema.org data can also be used to automatically trigger a template.

{{schema:@Type:key}} returns the value of the key from the schema.
{{schema:@Type:parent.child}} returns the value of a nested property.
{{schema:@Type:arrayKey}} returns the first item in an array.
{{schema:@Type:arrayKey[index].property}} returns the item at the specified index in an array.
{{schema:@Type:arrayKey[*].property}} returns a specific property from all items in an array.
You can also use a shorthand notation without specifying the schema type:

{{schema:author}} will match the first author property found in any schema type.
{{schema:name}} will match the first name property found in any schema type.
This shorthand is particularly useful when you don't know or don't care about the specific schema type, but you know the property name you're looking for.

Nested properties and array access work as well, both with and without the schema @Type specified:

{{schema:author.name}} will find the first author property and then access its name sub-property.
{{schema:author[0].name}} will access the name of the first author in an array of authors.
{{schema:author[*].name}} will return an array of all author names.

---
