# Advanced URI cookbook (ModMe-Vault)

Copy-paste URIs for vault name **`ModMe-Vault`**. Requires community plugin [Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri). Official docs: [publish.obsidian.md/advanced-uri-doc](https://publish.obsidian.md/advanced-uri-doc).

Encode spaces and special characters (`%20`, etc.). Prefer `commandid` over `commandname`.

## Navigation

Open ADAM Index:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Index.md
```

Open heading in a file (heading text only — no `#`):

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Index.md&heading=Quick%20links
```

Open workspace `main` (if saved):

```
obsidian://adv-uri?vault=ModMe-Vault&workspace=main
```

Open settings tab by id (plugin-dependent):

```
obsidian://adv-uri?vault=ModMe-Vault&settingid=unique-note-creator
```

## Writing / create / append

Write only if missing:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fscratch&data=Hello%20World
```

Overwrite:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fscratch&data=Replaced&mode=overwrite
```

Append clipboard to daily note:

```
obsidian://adv-uri?vault=ModMe-Vault&daily=true&clipboard=true&mode=append
```

Force new file (`mode=new` increments if exists):

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fnote&data=%23%20New&mode=new
```

## Commands

Close current tab after focusing a file:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Index.md&commandid=workspace%3Aclose
```

Create unique note (confirm ID in Advanced URI helper / command palette):

```
obsidian://adv-uri?vault=ModMe-Vault&commandid=unique-note-creator%3Acreate
```

Export focused file to PDF (example from upstream README):

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Index.md&commandid=workspace%3Aexport-pdf&confirm=true
```

## Search / replace

Search in a file:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fexample&search=TODO
```

Replace all in a file:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fexample&search=FIXME&replace=DONE
```

## Frontmatter

Read nested key to clipboard:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fexample&frontmatterkey=uid
```

Write severity:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=inbox%2Fexample&frontmatterkey=severity&data=high
```

Write nested list index (see upstream Frontmatter docs for JSON `data`):

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Index.md&frontmatterkey=%5Btags%2C0%5D&data=adam
```

## Bookmarks

```
obsidian://adv-uri?vault=ModMe-Vault&bookmark=ADAM%20Index&openmode=tab
```

## Canvas

Focus nodes / set viewport on the open canvas or a named canvas file:

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Command%20Center.canvas&canvasnodes=abc%2Cxyz
```

```
obsidian://adv-uri?vault=ModMe-Vault&filepath=docs%2Fadam%2FADAM%20Command%20Center.canvas&canvasviewport=100%2C-300%2C0.5
```

## Snippets

Markdown-only URI lists (optional): [uris/](uris/).

## Sources (scraped)

Repo `.firecrawl/publish.obsidian.md-advanced-uri-doc*.md` — Navigation, Writing, Commands, Search, Bookmarks, Frontmatter, Canvas.
