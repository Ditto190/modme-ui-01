#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.INGEST
 * Ingests inbox files into Supabase with contract validation.
 *
 * Usage:
 *   node scripts/inbox-ingest.mjs [--inbox-dir <path>] [--dry-run] [--skip-validation]
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  FORMAT_MAP,
  SKIP_FILES,
  TEXT_FORMATS,
  loadContract,
  parseInboxFile,
  validateFunnelFile,
  listInboxFilesSync,
} from './lib/inbox-contract.mjs';

const INBOX_DIR = process.argv.includes('--inbox-dir')
  ? process.argv[process.argv.indexOf('--inbox-dir') + 1]
  : resolve(import.meta.dirname, '../GenerativeUI_monorepo/docs/inbox');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_VALIDATION = process.argv.includes('--skip-validation');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run: yarn supabase:local:setup');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const contract = loadContract();

function extractTitle(content, filename) {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return basename(filename, extname(filename))
    .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, '')
    .replace(/_/g, ' ');
}

function extractSummary(body) {
  const lines = body.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return lines.slice(0, 3).join(' ').slice(0, 500) || null;
}

async function ingestInbox() {
  const files = listInboxFilesSync(INBOX_DIR);
  console.log(`Found ${files.length} files to process in ${INBOX_DIR}\n`);

  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (const filename of files) {
    const filePath = join(INBOX_DIR, filename);

    try {
      const parsed = parseInboxFile(filePath, filename);
      const { format, rawContent, body, frontmatter, contentHash, isBinary } = parsed;

      if (!SKIP_VALIDATION) {
        const validationFindings = validateFunnelFile(parsed, contract);
        const blocking = validationFindings.filter((f) => f.severity === 'error');
        if (blocking.length > 0) {
          for (const f of blocking) {
            console.error(`  ERROR [${f.code}]: ${filename} — ${f.message}`);
          }
          errors++;
          continue;
        }
      }

      const { data: existing } = await supabase
        .from('inbox_entries')
        .select('id, content_hash')
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (existing) {
        console.log(`  SKIP (already indexed): ${filename}`);
        skipped++;
        continue;
      }

      const title = frontmatter.title || extractTitle(body, filename);
      const summary = frontmatter.summary || extractSummary(body);
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
      const entryType = frontmatter.type || format;
      const severity = contract.enums.severity.includes(frontmatter.severity)
        ? frontmatter.severity
        : 'medium';

      const now = new Date().toISOString();
      const entry = {
        id: randomUUID(),
        content_hash: contentHash,
        source_file: filename,
        source_format: format,
        raw_content: rawContent.slice(0, 50000),
        extracted_text: rawContent.slice(0, 50000),
        title: title?.slice(0, 500),
        summary: summary?.slice(0, 1000),
        agent_name: frontmatter.agent || null,
        agent_role: frontmatter.agent_role || null,
        session_id: frontmatter.session_id || null,
        branch_name: frontmatter.branch || process.env.GITHUB_REF_NAME || null,
        pr_number: frontmatter.pr_number ?? null,
        tags,
        severity,
        entry_type: entryType,
        status: 'indexed',
        created_at: now,
        updated_at: now,
      };

      if (DRY_RUN) {
        console.log(`  DRY RUN - would ingest: ${filename}`);
        console.log(`     title: ${title} | format: ${format} | severity: ${severity}`);
        ingested++;
        continue;
      }

      const { error } = await supabase.from('inbox_entries').insert(entry);
      if (error) {
        console.error(`  ERROR: ${filename} — ${error.message}`);
        errors++;
        continue;
      }

      if (isBinary) {
        const fileBuffer = readFileSync(filePath);
        const { error: storageError } = await supabase.storage
          .from('inbox-files')
          .upload(`${contentHash}/${filename}`, fileBuffer, { upsert: true });
        if (storageError) {
          console.warn(`  Storage warning for ${filename}: ${storageError.message}`);
        }
      }

      console.log(`  INGESTED: ${filename}`);
      ingested++;
    } catch (err) {
      console.error(`  ERROR processing ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResults: ${ingested} ingested, ${skipped} skipped, ${errors} errors`);

  if (!DRY_RUN) {
    const { data: allEntries } = await supabase
      .from('inbox_entries')
      .select('id, source_file, title, summary, tags, entry_type, severity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (allEntries) {
      const index = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        entry_count: allEntries.length,
        entries: allEntries.map((e) => ({
          id: e.id,
          filename: e.source_file,
          title: e.title,
          summary: e.summary?.slice(0, 200),
          tags: e.tags,
          type: e.entry_type,
          severity: e.severity,
          status: e.status,
          created_at: e.created_at,
        })),
      };
      writeFileSync(join(INBOX_DIR, '_index.json'), JSON.stringify(index, null, 2));
      console.log(`\nUpdated _index.json with ${allEntries.length} total entries`);
    }
  }
}

ingestInbox().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
