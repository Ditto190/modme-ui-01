#!/usr/bin/env node
/**
 * @feature INBOX.SCRAPE.FIRECRAWL
 * Firecrawl extract stage — replaces Scrapy when --engine=firecrawl.
 *
 * Default: HTTP client to self-hosted Firecrawl (http://127.0.0.1:3022).
 * Optional CLI: FIRECRAWL_USE_CLI=1 (cloud or local --api-url).
 *
 * Usage:
 *   node scripts/firecrawl-scrape-stage.mjs --manifest=lean-ctx-shopping-list [--dry-run] [--local-only] [--api-url=URL]
 */
import { spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadRootEnv } from './lib/load-root-env.mjs';
import {
  checkHealth,
  getFirecrawlBaseUrl,
  scrapeUrl as scrapeUrlHttp,
} from './lib/firecrawl-local-client.mjs';
import { parseCollectionYaml } from './yaml-parser.mjs';
import { normalizeText, contentHash } from './lib/scrape-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FIRECRAWL_DIR = join(ROOT, '.firecrawl');
const RAW_DIR = join(FIRECRAWL_DIR, 'raw');
const STAGING_DIR = join(FIRECRAWL_DIR, 'staging');
const JOBS_DIR = join(ROOT, 'GenerativeUI_monorepo/scrape-pipeline/scrape-jobs');
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const manifestArg = args.find((a) => a.startsWith('--manifest='));
const MANIFEST = manifestArg ? manifestArg.split('=')[1] : 'lean-ctx-shopping-list';
const DRY_RUN = args.includes('--dry-run');
const LOCAL_ONLY = args.includes('--local-only') || !args.includes('--upsert-supabase');
const UPSERT_SUPABASE = args.includes('--upsert-supabase');
const USE_CLI =
  process.env.FIRECRAWL_USE_CLI === '1' ||
  process.env.FIRECRAWL_USE_CLI === 'true' ||
  args.includes('--use-cli');
const apiUrlArg = args.find((a) => a.startsWith('--api-url='));
const API_URL = apiUrlArg ? apiUrlArg.split('=').slice(1).join('=') : undefined;

function slugifyUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 60);
}

function isFirecrawlCliAvailable() {
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['firecrawl'], {
    encoding: 'utf8',
  });
  return which.status === 0;
}

function scrapeUrlCli(url, outPath, apiUrl) {
  const cliArgs = ['scrape', url, '--only-main-content', '-o', outPath];
  if (apiUrl) cliArgs.push('--api-url', apiUrl);
  const result = spawnSync('firecrawl', cliArgs, { encoding: 'utf8', timeout: 120000 });
  return { ok: result.status === 0, stderr: result.stderr || result.stdout || '' };
}

async function ensureFirecrawlReachable() {
  const baseUrl = API_URL ?? getFirecrawlBaseUrl();
  const health = await checkHealth(baseUrl);
  if (!health.ok) {
    console.error(`Firecrawl API unreachable at ${baseUrl}`);
    if (health.error) console.error(`  ${health.error}`);
    console.error('  Start local stack: yarn firecrawl:up');
    console.error('  Or set FIRECRAWL_API_URL / --api-url= for a remote instance');
    process.exit(2);
  }
  return baseUrl;
}

async function scrapeOne(url, outPath) {
  if (USE_CLI) {
    if (!isFirecrawlCliAvailable()) {
      return { ok: false, error: 'firecrawl CLI not on PATH (set FIRECRAWL_USE_CLI=0 for HTTP client)' };
    }
    const { ok, stderr } = scrapeUrlCli(url, outPath, API_URL ?? getFirecrawlBaseUrl());
    return { ok, error: stderr };
  }

  const result = await scrapeUrlHttp(url, { baseUrl: API_URL ?? getFirecrawlBaseUrl() });
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'scrape failed' };
  }
  if (!result.markdown) {
    return { ok: false, error: 'empty markdown response' };
  }
  writeFileSync(outPath, result.markdown, 'utf8');
  return { ok: true };
}

async function runPool(items, worker) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function openTelemetryRun(stats) {
  try {
    const bridge = await import('./telemetry/lib/telemetry-bridge.mjs');
    const run = await bridge.openPipelineRun({
      pipeline: 'scrape',
      mode: 'firecrawl',
      triggerSource: 'firecrawl-scrape-stage',
      metadata: { manifest: MANIFEST, transport: USE_CLI ? 'cli' : 'http' },
      dryRun: DRY_RUN,
    });
    await bridge.closePipelineRun({
      pipelineRunId: run.id,
      status: stats.failed > 0 ? 'failed' : 'completed',
      stats,
      dryRun: DRY_RUN,
    });
  } catch (err) {
    console.warn('telemetry-bridge advisory:', err instanceof Error ? err.message : err);
  }
}

async function upsertPages(pages, jobId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase env for --upsert-supabase');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  for (const page of pages) {
    const { error } = await supabase.from('scrape_pages').upsert(
      {
        id: page.id,
        job_id: jobId,
        url: page.url,
        content_hash: page.content_hash,
        text: page.text,
        html: page.html?.slice(0, 100_000) ?? null,
        status: 'raw',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'content_hash' }
    );
    if (error) {
      console.error(`  Supabase upsert failed ${page.url}:`, error.message);
    }
  }
}

async function main() {
  loadRootEnv({ fileWins: true });

  const yamlPath = join(JOBS_DIR, `${MANIFEST}.collection.yml`);
  const sidecarPath = join(JOBS_DIR, `${MANIFEST}.annotations.json`);

  if (!existsSync(yamlPath)) {
    console.error(`Manifest not found: ${yamlPath} — run yarn scrape:harvest first`);
    process.exit(2);
  }

  const collection = await parseCollectionYaml(yamlPath);
  const seeds = collection?.seeds ?? [];
  let annotations = {};
  if (existsSync(sidecarPath)) {
    annotations = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  }

  if (!seeds.length) {
    console.error('No seeds in manifest');
    process.exit(2);
  }

  const transport = USE_CLI ? 'cli' : 'http';
  const baseUrl = API_URL ?? getFirecrawlBaseUrl();
  console.log(
    `Firecrawl stage: manifest=${MANIFEST} seeds=${seeds.length} local_only=${LOCAL_ONLY} transport=${transport} api=${baseUrl}`
  );

  if (DRY_RUN) {
    for (const url of seeds) {
      console.log(`  DRY RUN scrape: ${url}`);
      if (annotations[url]) {
        console.log(`    hints: ${JSON.stringify(annotations[url].annotations?.slice(0, 2))}`);
      }
    }
    return;
  }

  if (!USE_CLI) {
    await ensureFirecrawlReachable();
  } else if (!isFirecrawlCliAvailable()) {
    console.error('FIRECRAWL_USE_CLI=1 but firecrawl CLI not on PATH');
    process.exit(2);
  }

  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(STAGING_DIR, { recursive: true });

  const stats = { scraped: 0, failed: 0, skipped: 0, urls: seeds.length };
  const pages = [];

  await runPool(seeds, async (url) => {
    const hashPrefix = contentHash(url).slice(0, 8);
    const slug = slugifyUrl(url);
    const rawPath = join(RAW_DIR, `${slug}-${hashPrefix}.md`);

    if (existsSync(rawPath)) {
      const text = normalizeText(readFileSync(rawPath, 'utf8'));
      if (text) {
        stats.skipped++;
        pages.push({
          id: randomUUID(),
          url,
          content_hash: contentHash(text),
          text: text.slice(0, 50_000),
          html: null,
          annotations: annotations[url] ?? null,
        });
        console.log(`  CACHE ${url}`);
        return;
      }
    }

    console.log(`  SCRAPE ${url}`);
    const { ok, error } = await scrapeOne(url, rawPath);
    if (!ok) {
      console.error(`  FAIL ${url}: ${String(error).slice(0, 200)}`);
      stats.failed++;
      return;
    }

    const text = normalizeText(readFileSync(rawPath, 'utf8'));
    if (!text) {
      console.warn(`  EMPTY ${url}`);
      stats.failed++;
      return;
    }

    stats.scraped++;
    pages.push({
      id: randomUUID(),
      url,
      content_hash: contentHash(text),
      text: text.slice(0, 50_000),
      html: null,
      annotations: annotations[url] ?? null,
    });
  });

  const manifestPath = join(STAGING_DIR, `${MANIFEST}.pages.json`);
  writeFileSync(manifestPath, JSON.stringify({ manifest: MANIFEST, pages }, null, 2), 'utf8');
  console.log(`\nStaging: ${manifestPath} (${pages.length} pages)`);

  if (UPSERT_SUPABASE && !LOCAL_ONLY) {
    const jobId = randomUUID();
    await upsertPages(pages, jobId);
    console.log(`Supabase upsert: job_id=${jobId}`);
  }

  await openTelemetryRun(stats);
  console.log(`\nResults: ${stats.scraped} scraped, ${stats.skipped} cached, ${stats.failed} failed`);
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

/** Export local pages for promote --local-only */
export function loadLocalStagingPages(manifest = MANIFEST) {
  const path = join(STAGING_DIR, `${manifest}.pages.json`);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return data.pages ?? [];
}

export function listLocalStagingManifests() {
  if (!existsSync(STAGING_DIR)) return [];
  return readdirSync(STAGING_DIR)
    .filter((f) => f.endsWith('.pages.json'))
    .map((f) => f.replace('.pages.json', ''));
}
