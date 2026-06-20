#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.INGEST
 * @domain INBOX
 * @entity ENTRY
 * @operation INGEST
 * @layer AGENT
 * @dependencies [DB.SCHEMA.INBOX_ENTRIES, DB.SCHEMA.PGVECTOR]
 *
 * inbox-ingest.mjs
 * Ingests new files from GenerativeUI_monorepo/docs/inbox/ into Supabase.
 * 
 * - Detects format (md, txt, pdf, url, jsx, snippet, html, csv)
 * - Computes SHA-256 content hash for dedup
 * - Extracts text + frontmatter
 * - Upserts to Supabase inbox_entries table
 * - Uploads binary files (pdf, images) to Supabase Storage
 * 
 * Usage:
 *   node scripts/inbox-ingest.mjs [--inbox-dir <path>] [--dry-run]
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, extname, basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// --- Config ---
const INBOX_DIR = process.argv.includes('--inbox-dir')
  ? process.argv[process.argv.indexOf('--inbox-dir') + 1]
  : resolve(import.meta.dirname, '../GenerativeUI_monorepo/docs/inbox');

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  console.error('   These come from next-forge/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Format detection ---
const FORMAT_MAP = {
  '.md': 'md',
  '.markdown': 'md',
  '.txt': 'txt',
  '.csv': 'csv',
  '.pdf': 'pdf',
  '.html': 'html',
  '.htm': 'html',
  '.url': 'url',
  '.jsx': 'jsx',
  '.tsx': 'jsx',
  '.ts': 'snippet',
  '.js': 'snippet',
  '.py': 'snippet',
  '.sh': 'snippet',
  '.json': 'snippet',
  '.yaml': 'snippet',
  '.yml': 'snippet',
};

const SKIP_FILES = new Set(['README.md', '_index.json', '.gitkeep', 'knowledge.db']);
const TEXT_FORMATS = new Set(['md', 'txt', 'csv', 'html', 'url', 'jsx', 'snippet']);

// --- YAML frontmatter parser (minimal, no deps) ---
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: {}, body: content };

  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return { frontmatter: {}, body: content };

  const yamlStr = content.slice(4, endIdx).trim();
  const body = content.slice(endIdx + 4).trim();
  const frontmatter = {};

  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!key || key.startsWith('-')) continue;

    // Handle arrays (next lines starting with '  -')
    if (value === '' || value === '[]') {
      frontmatter[key] = [];
    } else if (value.startsWith('[')) {
      // Inline array
      try {
        frontmatter[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        frontmatter[key] = value;
      }
    } else if (value === 'null') {
      frontmatter[key] = null;
    } else if (value === 'true') {
      frontmatter[key] = true;
    } else if (value === 'false') {
      frontmatter[key] = false;
    } else if (!Number.isNaN(Number(value)) && value !== '') {
      frontmatter[key] = Number(value);
    } else {
      // Strip quotes
      frontmatter[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  // Parse list items for array fields
  const lines = yamlStr.split('\n');
  let currentKey = null;
  for (const line of lines) {
    if (line.match(/^\w/) && line.includes(':')) {
      const key = line.split(':')[0].trim();
      currentKey = key;
    } else if (line.match(/^\s+-\s+/) && currentKey) {
      const item = line.replace(/^\s+-\s+/, '').trim();
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(item);
    }
  }

  return { frontmatter, body };
}

// --- Extract title from markdown ---
function extractTitle(content, filename) {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return basename(filename, extname(filename))
    .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, '')
    .replace(/_/g, ' ');
}

// --- Extract summary (first paragraph after title) ---
function extractSummary(body) {
  const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.slice(0, 3).join(' ').slice(0, 500) || null;
}

// --- SHA-256 hash ---
function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// --- Main ingest ---
async function ingestInbox() {
  const files = readdirSync(INBOX_DIR).filter(f => {
    if (SKIP_FILES.has(f) || f.startsWith('.')) return false;
    const ext = extname(f).toLowerCase();
    return ext in FORMAT_MAP;
  });

  console.log(`📦 Found ${files.length} files to process in ${INBOX_DIR}\n`);

  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (const filename of files) {
    const filePath = join(INBOX_DIR, filename);
    const ext = extname(filename).toLowerCase();
    const format = FORMAT_MAP[ext] || 'txt';

    let rawContent = '';
    let extractedText = '';
    let isBinary = false;

    try {
      if (format === 'pdf') {
        isBinary = true;
        rawContent = `[Binary PDF: ${filename}]`;
        extractedText = rawContent;
      } else if (TEXT_FORMATS.has(format)) {
        rawContent = readFileSync(filePath, 'utf-8');
        extractedText = rawContent;
      } else {
        isBinary = true;
        rawContent = `[Binary file: ${filename}]`;
        extractedText = rawContent;
      }

      const contentHash = sha256(rawContent);

      // Check for existing entry
      const { data: existing } = await supabase
        .from('inbox_entries')
        .select('id, content_hash')
        .eq('content_hash', contentHash)
        .single();

      if (existing) {
        console.log(`  ⏭️  SKIP (already indexed): ${filename}`);
        skipped++;
        continue;
      }

      // Parse frontmatter for .md files
      let frontmatter = {};
      let body = extractedText;
      if (format === 'md') {
        ({ frontmatter, body } = parseFrontmatter(rawContent));
      }

      const title = frontmatter.title || extractTitle(body, filename);
      const summary = frontmatter.summary || extractSummary(body);
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
      const entryType = frontmatter.type || format;
      const severity = frontmatter.severity || 'medium';

      const entry = {
        content_hash: contentHash,
        source_file: filename,
        source_format: format,
        raw_content: rawContent.slice(0, 50000), // cap at 50KB
        extracted_text: extractedText.slice(0, 50000),
        title: title?.slice(0, 500),
        summary: summary?.slice(0, 1000),
        agent_name: frontmatter.agent || null,
        agent_role: frontmatter.agent_role || null,
        session_id: frontmatter.session_id || null,
        branch_name: frontmatter.branch || process.env.GITHUB_REF_NAME || null,
        pr_number: frontmatter.pr_number || null,
        tags,
        severity,
        entry_type: entryType,
        status: 'indexed',
      };

      if (DRY_RUN) {
        console.log(`  🔍 DRY RUN - would ingest: ${filename}`);
        console.log(`     title: ${title}`);
        console.log(`     format: ${format} | severity: ${severity} | tags: ${tags.join(', ')}`);
        ingested++;
        continue;
      }

      const { error } = await supabase.from('inbox_entries').insert(entry);
      if (error) {
        console.error(`  ❌ ERROR: ${filename} — ${error.message}`);
        errors++;
        continue;
      }

      // Upload binary to Storage
      if (isBinary) {
        const fileBuffer = readFileSync(filePath);
        const { error: storageError } = await supabase.storage
          .from('inbox-files')
          .upload(`${contentHash}/${filename}`, fileBuffer, { upsert: true });
        if (storageError) {
          console.warn(`  ⚠️  Storage upload warning for ${filename}: ${storageError.message}`);
        }
      }

      console.log(`  ✅ INGESTED: ${filename}`);
      ingested++;

    } catch (err) {
      console.error(`  ❌ ERROR processing ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Results: ${ingested} ingested, ${skipped} skipped (already indexed), ${errors} errors`);

  if (!DRY_RUN) {
    // Update _index.json
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
        entries: allEntries.map(e => ({
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

      import('node:fs').then(({ writeFileSync }) => {
        writeFileSync(
          join(INBOX_DIR, '_index.json'),
          JSON.stringify(index, null, 2)
        );
        console.log(`\n📝 Updated _index.json with ${allEntries.length} total entries`);
      });
    }
  }
}

ingestInbox().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
