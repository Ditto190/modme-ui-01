# Code Emitter (local sandbox)

[obsidian-code-emitter](https://github.com/mokeyish/obsidian-code-emitter) runs fenced code blocks in-note like a lightweight Jupyter cell.

## ModMe policy

**Allowed in vault templates:** Python (Pyodide), TypeScript, JavaScript — local sandbox only.

**Disallowed in templates:** languages that POST to third-party playgrounds (Kotlin, Rust, Sololearn C/Go/Java/etc.). You may still paste such fences manually, but do not ship them in ModMe templates.

## Install

1. Obsidian → Community plugins → Browse → **Code Emitter** → Install → Enable.
2. Confirm allowlist in [Vault Plugin Policy](../adam/Vault%20Plugin%20Policy.md).

## Templates

| File | Use |
| ---- | --- |
| `Templates/tpl-code-sandbox` | Starter py / ts / js fences |
| Clipper **Code Snippet** | GitHub `.py` / `.ts` / `.js` blobs already emit matching fences |

## Examples

### Python (Pyodide)

```python
print("ok")
```

Optional packages via micropip (see upstream README):

```python
import micropip
await micropip.install("numpy")
import numpy as np
print(np.zeros(3))
```

### TypeScript

```typescript
const n: number = 1 + 1;
console.log(n);
```

### JavaScript

```javascript
console.log({ ok: true });
```

## Workflow with Clipper

1. Clip a GitHub blob with **ModMe Inbox — Code Snippet**.
2. Open the note in ModMe-Vault (`inbox/` junction).
3. Run the fence with Code Emitter.

## Security

- Local sandboxes still execute untrusted clipped code — review before run.
- Never put secrets in runnable fences.
- Prefer read-only inspection for unknown third-party repos.

Upstream scrape: `.firecrawl/raw.githubusercontent.com-mokeyish-obsidian-code-emitter-main-README.md.md`.
