#!/usr/bin/env node
/**
 * @feature INBOX.SCRAPE.CLASSIFY
 * Poll scrape_pages status=raw, classify via Ollama, write scrape_classifications.
 *
 * Usage:
 *   node scripts/scrape-classify.mjs [--limit 50] [--dry-run] [--local-only --manifest=lean-ctx-shopping-list]
 */
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { appendValidationError } from './lib/intake-validation-report.mjs';
import { randomUUID } from 'node:crypto';
import {
  classifyOutputSchema,
  safeValidate,
  formatZodIssues,
} from '../packages/intake-contracts/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STAGING_DIR = join(ROOT, '.firecrawl/staging');
const JOBS_DIR = join(ROOT, 'GenerativeUI_monorepo/scrape-pipeline/scrape-jobs');

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit'));
const LIMIT = limitArg ? Number(limitArg.split('=')[1] ?? args[args.indexOf('--limit') + 1]) : 50;
const DRY_RUN = args.includes('--dry-run');
const LOCAL_ONLY = args.includes('--local-only');
const manifestArg = args.find((a) => a.startsWith('--manifest='));
const MANIFEST = manifestArg ? manifestArg.split('=')[1] : 'lean-ctx-shopping-list';

async function loadClassifier() {
  const helperPath = resolve(ROOT, 'experiments/micro-agents/helpers/scrape-classifier-helper.ts');
  const distPath = resolve(ROOT, 'experiments/micro-agents/dist/helpers/scrape-classifier-helper.js');
  if (existsSync(distPath)) {
    return import(pathToFileURL(distPath).href);
  }
  if (existsSync(helperPath)) {
    try {
      return await import(pathToFileURL(helperPath).href);
    } catch {
      // fall through
    }
  }
  throw new Error('Build classifier first: cd experiments/micro-agents && npm run build');
}

function loadAnnotationsSidecar() {
  const path = join(JOBS_DIR, `${MANIFEST}.annotations.json`);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

function hintsForUrl(annotations, url) {
  const row = annotations[url];
  if (!row) return undefined;
  return {
    fragments: row.fragments ?? [],
    annotations: row.annotations ?? [],
    tags: row.tags ?? [],
    priority: row.priority ?? 'normal',
  };
}

function loadLocalPages() {
  const path = join(STAGING_DIR, `${MANIFEST}.pages.json`);
  if (!existsSync(path)) {
    if (DRY_RUN) {
      console.log(`No local staging (dry-run): ${path}`);
      return [];
    }
    console.error(`Local staging not found: ${path} — run firecrawl-scrape-stage first`);
    process.exit(2);
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return (data.pages ?? []).slice(0, LIMIT);
}

async function markPageFailed(supabase, pageId) {
  const now = new Date().toISOString();
  await supabase
    .from('scrape_pages')
    .update({ status: 'failed', updated_at: now })
    .eq('id', pageId);
}

async function classifyPages(pages, classifyScrapePageWithRetry, annotations, supabase) {
  let ok = 0;
  let failed = 0;
  const localResults = [];

  for (const page of pages) {
    const text = page.text || '';
    if (!text.trim()) {
      console.warn(`  SKIP empty text: ${page.url}`);
      appendValidationError({ stage: 'classify', url: page.url, issues: ['empty page text'] });
      if (!DRY_RUN && supabase) await markPageFailed(supabase, page.id);
      failed++;
      continue;
    }

    try {
      const result = await classifyScrapePageWithRetry({
        url: page.url,
        text,
        shoppingListHints: hintsForUrl(annotations, page.url),
      });
      const validated = safeValidate(classifyOutputSchema, result);

      if (!validated.ok) {
        const msg = formatZodIssues(validated.issues);
        console.error(`  QUARANTINE ${page.url}: ${msg}`);
        appendValidationError({ stage: 'classify', url: page.url, issues: [msg] });
        if (!DRY_RUN && supabase) await markPageFailed(supabase, page.id);
        failed++;
        continue;
      }

      const classification = validated.data;

      if (DRY_RUN) {
        console.log(`  DRY RUN ${page.url}`);
        console.log(`     type=${classification.entry_type} severity=${classification.severity}`);
        ok++;
        continue;
      }

      if (LOCAL_ONLY) {
        localResults.push({ page_id: page.id, url: page.url, ...classification });
        console.log(`  CLASSIFIED (local): ${page.url}`);
        ok++;
        continue;
      }

      const classificationId = randomUUID();
      const now = new Date().toISOString();

      const { error: clsError } = await supabase.from('scrape_classifications').insert({
        id: classificationId,
        page_id: page.id,
        entry_type: classification.entry_type,
        severity: classification.severity,
        agent_role: classification.agent_role,
        title: classification.title,
        summary: classification.summary,
        tags: classification.tags,
        features: classification.features,
        created_at: now,
      });

      if (clsError) {
        console.error(`  ERROR classification ${page.url}: ${clsError.message}`);
        failed++;
        continue;
      }

      await supabase
        .from('scrape_pages')
        .update({ status: 'classified', updated_at: now })
        .eq('id', page.id);

      console.log(`  CLASSIFIED: ${page.url} → ${classification.entry_type}/${classification.severity}`);
      ok++;
    } catch (err) {
      console.error(`  ERROR ${page.url}: ${err.message}`);
      appendValidationError({ stage: 'classify', url: page.url, issues: [err.message] });
      if (!DRY_RUN && supabase) await markPageFailed(supabase, page.id);
      failed++;
    }
  }

  if (LOCAL_ONLY && localResults.length && !DRY_RUN) {
    mkdirSync(STAGING_DIR, { recursive: true });
    const outPath = join(STAGING_DIR, `${MANIFEST}.classifications.json`);
    writeFileSync(outPath, JSON.stringify(localResults, null, 2), 'utf8');
    console.log(`\nLocal classifications: ${outPath}`);
  }

  console.log(`\nResults: ${ok} classified, ${failed} failed`);
}

async function main() {
  loadRootEnv({ fileWins: true });
  const annotations = loadAnnotationsSidecar();
  const { classifyScrapePageWithRetry } = await loadClassifier();

  if (LOCAL_ONLY) {
    const pages = loadLocalPages();
    if (!pages.length) {
      console.log('No local pages to classify.');
      return;
    }
    console.log(`Classifying ${pages.length} local page(s)...\n`);
    await classifyPages(pages, classifyScrapePageWithRetry, annotations, null);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: pages, error } = await supabase
    .from('scrape_pages')
    .select('id, url, text')
    .eq('status', 'raw')
    .order('created_at', { ascending: true })
    .limit(LIMIT);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  if (!pages?.length) {
    console.log('No raw scrape_pages to classify.');
    return;
  }

  console.log(`Classifying ${pages.length} page(s)...\n`);
  await classifyPages(pages, classifyScrapePageWithRetry, annotations, supabase);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
