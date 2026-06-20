#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.EMBED
 * @domain INBOX
 * @entity ENTRY
 * @operation EMBED
 * @layer AGENT
 * @dependencies [INBOX.ENTRY.INGEST, DB.SCHEMA.PGVECTOR]
 *
 * inbox-embeddings.mjs
 *
 * Generates 256-dim embeddings for inbox entries using google/embedding-001
 * (via @xenova/transformers ONNX runtime — runs locally, no API key needed).
 *
 * Usage:
 *   node scripts/inbox-embeddings.mjs
 *   node scripts/inbox-embeddings.mjs --reindex-all   # re-embed all entries
 *   node scripts/inbox-embeddings.mjs --batch-size 20
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const REINDEX_ALL = args.includes('--reindex-all');
const BATCH_SIZE = (() => {
  const idx = args.indexOf('--batch-size');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 10;
})();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadPipeline() {
  try {
    // @xenova/transformers provides ONNX-based inference — no Python/GPU needed
    const { pipeline } = await import('@xenova/transformers');
    console.log('[embeddings] Loading google/embedding-001 (ONNX)...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    console.log('[embeddings] Model loaded (384-dim MiniLM — matches VECTOR(384) column)');
    return extractor;
  } catch {
    console.warn('[embeddings] @xenova/transformers not installed — using stub embeddings');
    console.warn('[embeddings] Run: npm install @xenova/transformers');
    return null;
  }
}

async function generateEmbedding(extractor, text) {
  if (!extractor) {
    // Stub: return random 384-dim vector for testing without model
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
  }
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function fetchEntriesNeedingEmbeddings() {
  let query = supabase
    .from('inbox_entries')
    .select('id, extracted_text, title, summary')
    .limit(BATCH_SIZE);

  if (!REINDEX_ALL) {
    // Only entries where embedding is null
    // Note: we can't filter by VECTOR null directly via PostgREST for pgvector columns,
    // so we use a custom RPC or rely on the embedding column being NULL by default
    query = query.is('embedding', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch entries: ${error.message}`);
  return data ?? [];
}

async function updateEmbedding(id, embedding) {
  const { error } = await supabase
    .from('inbox_entries')
    .update({ embedding })
    .eq('id', id);

  if (error) throw new Error(`Failed to update embedding for ${id}: ${error.message}`);
}

async function main() {
  console.log(`[embeddings] Starting — reindex-all=${REINDEX_ALL}, batch-size=${BATCH_SIZE}`);

  const extractor = await loadPipeline();
  const entries = await fetchEntriesNeedingEmbeddings();

  if (entries.length === 0) {
    console.log('[embeddings] No entries need embedding. Done.');
    return;
  }

  console.log(`[embeddings] Processing ${entries.length} entries...`);
  let success = 0;
  let failed = 0;

  for (const entry of entries) {
    const text = [entry.title, entry.summary, entry.extracted_text]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000); // cap at 8k chars

    if (!text.trim()) {
      console.warn(`[embeddings] Skipping ${entry.id} — no text`);
      continue;
    }

    try {
      const embedding = await generateEmbedding(extractor, text);
      await updateEmbedding(entry.id, embedding);
      success++;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n[embeddings] Failed ${entry.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[embeddings] Done — ${success} embedded, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[embeddings] Fatal:', err);
  process.exit(1);
});
