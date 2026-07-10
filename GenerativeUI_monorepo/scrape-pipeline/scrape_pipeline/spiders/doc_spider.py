"""Doc spider — manifest-driven crawl with trafilatura extraction."""

from __future__ import annotations

import hashlib
import re
from urllib.parse import urlparse

import scrapy
import trafilatura
from scrapy.linkextractors import LinkExtractor

from scrape_pipeline.items import ScrapePageItem


def normalize_text(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text or "").strip()
    return collapsed


def content_hash(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


class DocSpider(scrapy.Spider):
    name = "doc_spider"
    custom_settings = {
        "ROBOTSTXT_OBEY": True,
    }

    def __init__(
        self,
        manifest: dict | None = None,
        job_id: str | None = None,
        dry_run: bool = False,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.manifest = manifest or {}
        self.job_id = job_id
        self.dry_run = str(dry_run).lower() in ("1", "true", "yes")
        self.seeds = self.manifest.get("seeds", [])
        self.depth_limit = int(self.manifest.get("depth", 2))
        self.allowlist = self.manifest.get("allowlist") or []
        self.use_playwright = bool(self.manifest.get("use_playwright", False))
        rate = float(self.manifest.get("rate_limit_seconds", 1))
        self.custom_settings["DOWNLOAD_DELAY"] = rate
        if not self.manifest.get("obey_robots", True):
            self.custom_settings["ROBOTSTXT_OBEY"] = False

        allow_domains = []
        for seed in self.seeds:
            parsed = urlparse(seed)
            if parsed.netloc:
                allow_domains.append(parsed.netloc)
        self.allowed_domains = list(dict.fromkeys(allow_domains)) or None

        allow_patterns = [re.escape(p) for p in self.allowlist] if self.allowlist else None
        self.link_extractor = LinkExtractor(
            allow_domains=self.allowed_domains,
            allow=allow_patterns,
            unique=True,
        )

    def start_requests(self):
        sitemap_url = self.manifest.get("sitemap_url")
        if sitemap_url:
            yield scrapy.Request(sitemap_url, callback=self.parse_sitemap, dont_filter=True)
        for url in self.seeds:
            yield self._request(url, depth=0)

    def _request(self, url: str, depth: int):
        meta = {"depth": depth}
        if self.use_playwright:
            meta["playwright"] = True
        return scrapy.Request(url, callback=self.parse_page, meta=meta, dont_filter=True)

    def parse_sitemap(self, response):
        locs = response.xpath("//*[local-name()='loc']/text()").getall()
        for loc in locs[:200]:
            yield self._request(loc.strip(), depth=0)

    def parse_page(self, response):
        html = response.text
        extracted = trafilatura.extract(html, url=response.url, include_links=False) or ""
        text = normalize_text(extracted)
        if not text:
            self.logger.debug("skip empty extract: %s", response.url)
            return

        item = ScrapePageItem(
            job_id=self.job_id,
            url=response.url,
            content_hash=content_hash(text),
            html=html[:100_000],
            extracted_text=text[:50_000],
            status="raw",
            metadata={"depth": response.meta.get("depth", 0)},
        )
        yield item

        depth = int(response.meta.get("depth", 0))
        if depth >= self.depth_limit:
            return
        for link in self.link_extractor.extract_links(response):
            yield self._request(link.url, depth=depth + 1)
