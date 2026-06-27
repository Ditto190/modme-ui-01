#!/usr/bin/env node

/**

 * @feature INBOX.SCRAPE.CLASSIFY

 * Poll scrape_pages status=raw, classify via Ollama, write scrape_classifications.

 *

 * Usage:

 *   node scripts/scrape-classify.mjs [--limit 50] [--dry-run]

 */

import { createClient } from '@supabase/supabase-js';

import { resolve, dirname } from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';

import { existsSync } from 'node:fs';

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



const args = process.argv.slice(2);

const limitArg = args.find((a) => a.startsWith('--limit'));

const LIMIT = limitArg ? Number(limitArg.split('=')[1] ?? args[args.indexOf('--limit') + 1]) : 50;

const DRY_RUN = args.includes('--dry-run');



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



async function markPageFailed(supabase, pageId) {
  const now = new Date().toISOString();
  await supabase
    .from('scrape_pages')
    .update({ status: 'failed', updated_at: now })
    .eq('id', pageId);
}



async function main() {

  loadRootEnv({ fileWins: true });



  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {

    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

    process.exit(1);

  }



  const supabase = createClient(url, key);

  const { classifyScrapePageWithRetry } = await loadClassifier();



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

  let ok = 0;

  let failed = 0;



  for (const page of pages) {

    const text = page.text || '';

    if (!text.trim()) {

      console.warn(`  SKIP empty text: ${page.url}`);

      const issues = ['empty page text'];

      appendValidationError({ stage: 'classify', url: page.url, issues });

      if (!DRY_RUN) await markPageFailed(supabase, page.id);

      failed++;

      continue;

    }



    try {

      const result = await classifyScrapePageWithRetry({ url: page.url, text });

      const validated = safeValidate(classifyOutputSchema, result);



      if (!validated.ok) {

        const msg = formatZodIssues(validated.issues);

        console.error(`  QUARANTINE ${page.url}: ${msg}`);

        appendValidationError({ stage: 'classify', url: page.url, issues: [msg] });

        if (!DRY_RUN) await markPageFailed(supabase, page.id);

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



      const { error: pageError } = await supabase

        .from('scrape_pages')

        .update({ status: 'classified', updated_at: now })

        .eq('id', page.id);



      if (pageError) {

        console.error(`  ERROR update page ${page.url}: ${pageError.message}`);

        failed++;

        continue;

      }



      console.log(`  CLASSIFIED: ${page.url} → ${classification.entry_type}/${classification.severity}`);

      ok++;

    } catch (err) {

      console.error(`  ERROR ${page.url}: ${err.message}`);

      appendValidationError({

        stage: 'classify',

        url: page.url,

        issues: [err.message],

      });

      if (!DRY_RUN) await markPageFailed(supabase, page.id);

      failed++;

    }

  }



  console.log(`\nResults: ${ok} classified, ${failed} failed`);

}



main().catch((err) => {

  console.error('Fatal:', err);

  process.exit(1);

});


