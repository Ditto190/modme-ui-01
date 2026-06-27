#!/usr/bin/env node
/**
 * @feature INBOX.SCRAPE.PROMOTE
 * Batch promote classified scrape_pages → inbox_entries (+ optional funnel .md).
 * Zod promote contract gate via packages/intake-contracts.
 *
 * Usage:
 *   node scripts/scrape-promote.mjs [--dry-run] [--export-md] [--limit 50]
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { loadContract } from './lib/inbox-contract.mjs';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { appendValidationError } from './lib/intake-validation-report.mjs';
import {
  validateInboxPromoteEntry,
  validateScrapePromoteBatchOutput,
  formatIssues,
} from '../packages/intake-contracts/index.mjs';
import { maybeGenerateSpecifyArtefacts } from './lib/specify-artefacts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INBOX_DIR = join(ROOT, 'GenerativeUI_monorepo/docs/inbox');
const REPORT_DIR = resolve(ROOT, 'docs/inbox-pipeline/reports');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const EXPORT_MD = args.includes('--export-md');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1] || 50) : 50;

function slugifyUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 80);
}

function exportMarkdown(page, classification) {
  const now = new Date().toISOString();
  const slug = slugifyUrl(page.url);
  const filename = `${now.replace(/[:.]/g, '-').slice(0, 19)}_${classification.entry_type}_researcher_${slug}.md`;
  const frontmatter = [
    '---',
    `timestamp: ${now}`,
    'agent: scrape-pipeline',
    `agent_role: ${classification.agent_role || 'researcher'}`,
    `type: ${classification.entry_type}`,
    `severity: ${classification.severity}`,
    `tags: [${(classification.tags || []).join(', ')}]`,
    `title: ${classification.title}`,
    `summary: ${classification.summary}`,
    '---',
    '',
    `# ${classification.title}`,
    '',
    `Source: ${page.url}`,
    '',
    classification.summary || '',
    '',
    '## Extracted content',
    '',
    (page.text || '').slice(0, 10000),
  ].join('\n');

  if (!existsSync(INBOX_DIR)) {
    mkdirSync(INBOX_DIR, { recursive: true });
  }
  const outPath = join(INBOX_DIR, filename);
  writeFileSync(outPath, frontmatter, 'utf8');
  return filename;
}

function pickClassification(page) {
  const row = page.scrape_classifications;
  if (Array.isArray(row)) return row[0];
  return row;
}

function appendValidationReport(stage, url, issues) {
  appendValidationError({
    stage,
    url,
    issues: issues.map((i) => (typeof i === 'string' ? i : formatIssues([i]))),
  });
}

async function main() {
  loadRootEnv({ fileWins: true });
  const contract = loadContract();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from('scrape_pages')
    .select(
      `id, url, content_hash, text, status, inbox_entry_id,
       scrape_classifications (
         id, entry_type, severity, agent_role, title, summary, tags, features, promoted_at
       )`
    )
    .eq('status', 'classified')
    .is('inbox_entry_id', null)
    .limit(LIMIT);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No classified pages ready for promotion.');
    return;
  }

  let promoted = 0;
  let skipped = 0;
  let errors = 0;
  const promotions = [];

  for (const page of rows) {
    const classification = pickClassification(page);

    if (!classification || classification.promoted_at) {
      skipped++;
      continue;
    }

    const contentHash = page.content_hash;
    if (!contentHash || contentHash.length !== contract.entryRecord.contentHashLength) {
      console.error(`  ERROR invalid hash: ${page.url}`);
      errors++;
      continue;
    }

    const codePatternIds = Array.isArray(classification.features?.code_pattern_ids)
      ? classification.features.code_pattern_ids.map(String)
      : [];

    const { data: existing } = await supabase
      .from('inbox_entries')
      .select('id')
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (existing) {
      console.log(`  SKIP dedup: ${page.url}`);
      if (!DRY_RUN) {
        const now = new Date().toISOString();
        await supabase
          .from('scrape_pages')
          .update({ inbox_entry_id: existing.id, status: 'promoted', updated_at: now })
          .eq('id', page.id);
        await supabase
          .from('scrape_classifications')
          .update({ promoted_at: now })
          .eq('id', classification.id);
      }
      promotions.push({
        page_id: page.id,
        inbox_entry_id: existing.id,
        content_hash: contentHash,
        code_pattern_ids: codePatternIds,
      });
      skipped++;
      continue;
    }

    const now = new Date().toISOString();
    const entryId = randomUUID();
    const text = page.text || '';
    const entry = {
      id: entryId,
      content_hash: contentHash,
      source_file: page.url,
      source_format: 'url',
      source_kind: 'scrape_url',
      raw_content: text.slice(0, 50000),
      extracted_text: text.slice(0, 50000),
      title: classification.title?.slice(0, 500),
      summary: classification.summary?.slice(0, 1000),
      agent_name: 'scrape-pipeline',
      agent_role: classification.agent_role,
      tags: classification.tags || [],
      severity: contract.enums.severity.includes(classification.severity)
        ? classification.severity
        : 'medium',
      entry_type: contract.enums.entryType.includes(classification.entry_type)
        ? classification.entry_type
        : 'research',
      status: 'indexed',
      code_pattern_ids: codePatternIds,
      created_at: now,
      updated_at: now,
    };

    const entryValidated = validateInboxPromoteEntry(entry);
    if (!entryValidated.ok) {
      appendValidationReport('promote', page.url, entryValidated.issues);
      console.error(`  QUARANTINE ${page.url}: ${formatIssues(entryValidated.issues)}`);
      if (!DRY_RUN) {
        await supabase
          .from('scrape_pages')
          .update({ status: 'failed', updated_at: now })
          .eq('id', page.id);
      }
      errors++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  DRY RUN promote: ${page.url}`);
      console.log(`     title=${entry.title} type=${entry.entry_type}`);
      promotions.push({
        page_id: page.id,
        content_hash: contentHash,
        code_pattern_ids: codePatternIds,
      });
      promoted++;
      continue;
    }

    const { error: insertError } = await supabase.from('inbox_entries').insert(entry);
    if (insertError) {
      console.error(`  ERROR insert ${page.url}: ${insertError.message}`);
      errors++;
      continue;
    }

    for (const greptimeId of codePatternIds) {
      await supabase.from('code_pattern_refs').insert({
        id: randomUUID(),
        inbox_entry_id: entryId,
        greptime_id: greptimeId,
        path: page.url,
        created_at: now,
      });
    }

    await supabase
      .from('scrape_pages')
      .update({ inbox_entry_id: entryId, status: 'promoted', updated_at: now })
      .eq('id', page.id);

    await supabase
      .from('scrape_classifications')
      .update({ promoted_at: now })
      .eq('id', classification.id);

    let exportPath;
    if (EXPORT_MD) {
      exportPath = exportMarkdown(page, classification);
      console.log(`  EXPORTED md: ${exportPath}`);
    }

    await maybeGenerateSpecifyArtefacts(supabase, {
      entryId,
      contentHash,
      entryType: entry.entry_type,
      severity: entry.severity,
      title: entry.title,
      summary: entry.summary,
      features: classification.features,
    });

    console.log(`  PROMOTED: ${page.url}`);
    promotions.push({
      page_id: page.id,
      inbox_entry_id: entryId,
      content_hash: contentHash,
      promoted_at: now,
      export_path: exportPath,
      code_pattern_ids: codePatternIds,
    });
    promoted++;
  }

  const batchOutput = {
    promoted_count: promoted,
    skipped_count: skipped,
    dry_run: DRY_RUN,
    promotions,
  };
  const batchValidated = validateScrapePromoteBatchOutput(batchOutput);
  if (!batchValidated.ok) {
    console.error('Promote batch output contract failed:', formatIssues(batchValidated.issues));
    process.exit(1);
  }

  console.log(`\nResults: ${promoted} promoted, ${skipped} skipped, ${errors} errors`);
  if (errors > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
