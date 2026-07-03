---
name: firecrawl-local
description: |
  Scrape the web via ModMe's self-hosted Firecrawl Docker stack (local-only).
  Use when the task needs web scraping, shopping-list harvest, or inbox scrape
  with --engine=firecrawl. Do NOT use firecrawl login or cloud API keys for
  ModMe workflows — use yarn firecrawl:up and the HTTP client instead.
---

# Firecrawl Local (ModMe self-host)

ModMe runs Firecrawl in Docker at **http://127.0.0.1:3022**. No cloud login.

## Quick start

```powershell
yarn firecrawl:setup   # once: clone .vendor/firecrawl + .env
yarn firecrawl:up      # docker compose up -d
yarn firecrawl:status  # health check
```

## Scrape commands

```powershell
# Dry-run (no HTTP, lists seeds)
yarn scrape:firecrawl -- --manifest=lean-ctx-shopping-list --dry-run

# Full shopping-list pipeline
yarn scrape:shopping-list --dry-run
yarn scrape:shopping-list
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `FIRECRAWL_API_URL` | `http://127.0.0.1:3022` | Self-hosted API base |
| `FIRECRAWL_USE_CLI` | `0` | Set `1` to use `firecrawl` CLI instead of HTTP |

Root `.env` is loaded via `scripts/lib/load-root-env.mjs`.

## HTTP API

`scripts/lib/firecrawl-local-client.mjs` calls `POST /v1/scrape` with `formats: ["markdown"]`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `yarn firecrawl:status` exit 2 | Run `yarn firecrawl:setup` |
| exit 1 (unreachable) | Start Docker, then `yarn firecrawl:up` |
| Port conflict | Default is 3022 (not 3002); edit `.vendor/firecrawl/.env` |

## Do not

- Run `firecrawl login` for ModMe inbox/scrape tasks
- Commit `.vendor/firecrawl/` or `.firecrawl/` (gitignored)

Docs: `docs/inbox-pipeline/README.md`, `GenerativeUI_monorepo/docs/inbox/SHOPPING-LIST-GUIDE.md` § Firecrawl.
