# Scrape Pipeline

Scrapy + Playwright crawl into Supabase staging tables for the ModMe inbox pipeline.

## Setup

```powershell
cd GenerativeUI_monorepo/scrape-pipeline
pip install -e .
playwright install chromium
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in repo root `.env`.

## Run

```powershell
python -m scrape_pipeline --manifest docs-sitemap --dry-run
python -m scrape_pipeline --manifest docs-sitemap
```

From repo root: `yarn scrape:run`
