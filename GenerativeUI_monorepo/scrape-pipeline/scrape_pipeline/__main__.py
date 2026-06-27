#!/usr/bin/env python3
"""CLI entry: python -m scrape_pipeline --manifest docs-sitemap [--dry-run]"""

from __future__ import annotations

import argparse
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

from scrape_pipeline.spiders.doc_spider import DocSpider


def load_manifest(slug: str) -> dict:
    jobs_dir = Path(__file__).resolve().parent.parent / "scrape-jobs"
    path = jobs_dir / f"{slug}.collection.yml"
    if not path.exists():
        raise FileNotFoundError(f"Manifest not found: {path}")
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Invalid manifest YAML: {path}")
    return data


def ensure_job(manifest: dict, dry_run: bool) -> str | None:
    if dry_run:
        return str(uuid.uuid4())
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("Supabase env vars required for live crawl")

    from supabase import create_client

    client = create_client(url, key)
    slug = manifest["slug"]
    now = datetime.now(timezone.utc).isoformat()

    existing = client.table("scrape_manifests").select("id").eq("slug", slug).maybe_single().execute()
    manifest_id = existing.data["id"] if existing.data else None
    if not manifest_id:
        inserted = (
            client.table("scrape_manifests")
            .insert(
                {
                    "slug": slug,
                    "name": manifest.get("name", slug),
                    "description": manifest.get("description"),
                    "seeds": manifest.get("seeds", []),
                    "config": {
                        "depth": manifest.get("depth", 2),
                        "allowlist": manifest.get("allowlist", []),
                        "use_playwright": manifest.get("use_playwright", False),
                    },
                    "schedule": manifest.get("schedule"),
                }
            )
            .execute()
        )
        manifest_id = inserted.data[0]["id"]

    job = (
        client.table("scrape_jobs")
        .insert(
            {
                "manifest_id": manifest_id,
                "status": "running",
                "started_at": now,
            }
        )
        .execute()
    )
    return job.data[0]["id"]


def finish_job(job_id: str | None, status: str, error: str | None = None) -> None:
    if not job_id:
        return
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        return
    from supabase import create_client

    client = create_client(url, key)
    payload: dict = {
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        payload["error_message"] = error[:2000]
    client.table("scrape_jobs").update(payload).eq("id", job_id).execute()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run scrape manifest crawl")
    parser.add_argument("--manifest", required=True, help="Manifest slug (e.g. docs-sitemap)")
    parser.add_argument("--dry-run", action="store_true", help="Crawl without Supabase writes")
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    manifest.setdefault("slug", args.manifest)
    job_id = None
    try:
        job_id = ensure_job(manifest, args.dry_run)
        settings = get_project_settings()
        settings.set("SCRAPE_DRY_RUN", args.dry_run)
        process = CrawlerProcess(settings)
        process.crawl(DocSpider, manifest=manifest, job_id=job_id, dry_run=args.dry_run)
        process.start()
        if not args.dry_run:
            finish_job(job_id, "done")
    except Exception as exc:
        if not args.dry_run:
            finish_job(job_id, "failed", str(exc))
        raise


if __name__ == "__main__":
    main()
