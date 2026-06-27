/**
 * Embed AST chunks and upsert to GreptimeDB.
 */
import { createHash } from 'node:crypto';
import { indexTypeScriptPaths, type CodeChunk } from './ast-indexer.js';
import { greptimeClient } from '../models/greptimedb_client.js';
import { pipeline } from '@xenova/transformers';

export interface CodeIndexResult {
  indexed: number;
  skipped: number;
  chunks: CodeChunk[];
  greptime_ids: string[];
}

async function embedText(extractor: Awaited<ReturnType<typeof pipeline>>, text: string): Promise<number[]> {
  const fn = extractor as (t: string, o: Record<string, unknown>) => Promise<{ data: Float32Array }>;
  const output = await fn(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function chunkId(chunk: CodeChunk): string {
  return createHash('sha256').update(`${chunk.path}:${chunk.symbol_name}`).digest('hex').slice(0, 32);
}

export async function runCodeIndex(options: {
  rootDir: string;
  dryRun?: boolean;
}): Promise<CodeIndexResult> {
  const chunks = indexTypeScriptPaths({
    rootDir: options.rootDir,
    globs: ['**/*.ts', '**/*.tsx'],
    maxFiles: 300,
  });
  const greptime_ids: string[] = [];

  if (options.dryRun) {
    return { indexed: 0, skipped: 0, chunks, greptime_ids };
  }

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });

  await greptimeClient.init();

  let indexed = 0;
  let skipped = 0;

  for (const chunk of chunks) {
    const id = chunkId(chunk);
    const existing = chunk.content_hash
      ? await greptimeClient.findByContentHash(chunk.content_hash)
      : null;
    if (existing) {
      skipped++;
      greptime_ids.push(existing.id);
      continue;
    }

    const embedding = await embedText(extractor, chunk.text);
    await greptimeClient.upsertEmbedding({
      id,
      path: chunk.path,
      text: chunk.text,
      embedding,
      sections: [chunk.ast_kind, chunk.symbol_name],
      timestamp: Date.now(),
      modelId: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      ast_kind: chunk.ast_kind,
      content_hash: chunk.content_hash,
      schema_json: chunk.schema_json,
    });
    greptime_ids.push(id);
    indexed++;
  }

  return { indexed, skipped, chunks, greptime_ids };
}

async function main() {
  const rootDir = process.argv[2] || process.cwd();
  const dryRun = process.argv.includes('--dry-run');
  const result = await runCodeIndex({ rootDir, dryRun });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.includes('code-index-runner')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
