"""Batch upsert scrape_pages to Supabase staging (pattern: intake-pipeline/supabase_syncer.py)."""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any

CHUNK_SIZE = 100


class SupabaseStagingPipeline:
    def __init__(self):
        self.url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
        self.dry_run = False
        self.buffer: list[dict] = []
        self._client = None

    @classmethod
    def from_crawler(cls, crawler):
        pipe = cls()
        pipe.dry_run = crawler.settings.getbool("SCRAPE_DRY_RUN", False)
        return pipe

    def open_spider(self, spider):
        if self.dry_run:
            spider.logger.info("SupabaseStagingPipeline: dry-run mode — no DB writes")
            return
        if not self.url or not self.key:
            raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            from supabase import create_client

            self._client = create_client(self.url, self.key)
        except ImportError:
            self._client = False
        return self._client

    def _rest_upsert(self, rows: list[dict]) -> None:
        endpoint = self.url.rstrip("/") + "/rest/v1/scrape_pages"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }
        payload = json.dumps(rows).encode()
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status not in (200, 201, 204):
                raise RuntimeError(f"Supabase REST error {resp.status}")

    def _flush(self, spider):
        if not self.buffer:
            return
        rows = self.buffer
        self.buffer = []
        if self.dry_run:
            spider.logger.info("dry-run: would upsert %d scrape_pages", len(rows))
            return
        client = self._get_client()
        for i in range(0, len(rows), CHUNK_SIZE):
            chunk = rows[i : i + CHUNK_SIZE]
            if client:
                client.table("scrape_pages").upsert(chunk, on_conflict="content_hash").execute()
            else:
                self._rest_upsert(chunk)
        spider.logger.info("upserted %d rows -> scrape_pages", len(rows))

    def process_item(self, item, spider):
        row = {
            "job_id": item.get("job_id"),
            "url": item["url"],
            "content_hash": item["content_hash"],
            "html": item.get("html"),
            "text": item.get("extracted_text"),
            "status": item.get("status", "raw"),
            "metadata": item.get("metadata") or {},
        }
        if not row["job_id"]:
            spider.logger.warning("skip page without job_id: %s", row["url"])
            return item
        self.buffer.append(row)
        if len(self.buffer) >= CHUNK_SIZE:
            self._flush(spider)
        return item

    def close_spider(self, spider):
        self._flush(spider)
