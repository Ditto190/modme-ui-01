---
applyTo: 'config-schema.json, .lean-ctx.toml, docs/lean-ctx/**'
description: 'lean-ctx configuration for ModMe — XDG global config, project overrides, schema reference. Use yarn lean-ctx:ensure; never hand-convert JSON to TOML.'
---

# lean-ctx configuration (ModMe)

- **Global:** `~/.config/lean-ctx/config.toml` (XDG)
- **Project:** `.lean-ctx.toml` (merged; project wins)
- **Schema reference:** `docs/lean-ctx/config-schema.json` from `lean-ctx config schema`

```powershell
yarn lean-ctx:ensure
yarn lean-ctx:ensure:check
yarn lean-ctx:schema:sync
```

Use `lean-ctx config set`, `config init --full`, and `config validate` — not manual JSON→TOML conversion.

See [docs/lean-ctx-guide.md](../../docs/lean-ctx-guide.md) and [`.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md`](../../.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md).
