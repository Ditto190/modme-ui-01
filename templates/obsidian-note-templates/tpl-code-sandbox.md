---
uid: "{{date:YYYYMMDDHHmm}}"
created: "{{date:YYYY-MM-DDTHH:mm:ssZ}}"
type: research
tags:
  - code-emitter
  - sandbox
  - local-only
source: ""
languages:
  - python
  - typescript
  - javascript
---

# Code sandbox

Local-only runners via **Code Emitter** (Pyodide / JS sandbox). Do not use remote playground languages (Kotlin, Rust, Sololearn, etc.) in vault templates.

## Python (Pyodide)

```python
print("hello from ModMe sandbox")
```

## TypeScript (local compiler + JS sandbox)

```typescript
const msg: string = "hello from ModMe sandbox";
console.log(msg);
```

## JavaScript (JS sandbox)

```javascript
console.log("hello from ModMe sandbox");
```

## Notes

- Click the Code Emitter run control on a fence after installing the plugin.
- Prefer clipped GitHub `.py` / `.ts` / `.js` notes from `ModMe Inbox — Code Snippet` — fences are already runnable.
- See `docs/obsidian/code-emitter.md`.
