#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.EMBED
 * Generates 384-dim embeddings for inbox entries (MiniLM).
 * Fails unless @xenova/transformers available OR USE_LOCAL_EMBEDDINGS=true.
 */
import { createClient } from '@supabase/supabase-js';
import { loadRootEnv } from './lib/load-root-env.mjs';

loadRootEnv({ fileWins: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_LOCAL = process.env.USE_LOCAL_EMBEDDINGS === 'true';

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
    const { pipeline } = await import('@xenova/transformers');
    console.log('[embeddings] Loading Xenova/all-MiniLM-L6-v2 (ONNX)...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    console.log('[embeddings] Model loaded (384-dim)');
    return extractor;
  } catch (err) {
    if (USE_LOCAL) {
      console.warn('[embeddings] @xenova/transformers unavailable — USE_LOCAL_EMBEDDINGS stub enabled');
      return null;
    }
    console.error('[embeddings] @xenova/transformers required. Install it or set USE_LOCAL_EMBEDDINGS=true');
    console.error(err?.message || err);
    process.exit(1);
  }
}

async function generateEmbedding(extractor, text) {
  if (!extractor) {
    if (!USE_LOCAL) {
      throw new Error('Embedding model unavailable');
    }
    const hash = [...text].reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
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
  console.log(`[embeddings] Starting — reindex-all=${REINDEX_ALL}, batch-size=${BATCH_SIZE}, local=${USE_LOCAL}`);

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
      .slice(0, 8000);

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
