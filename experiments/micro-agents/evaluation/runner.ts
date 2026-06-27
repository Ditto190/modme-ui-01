/**
 * Evaluation Runner — agent queries + hybrid RAG retrieval (Recall@5).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { greptimeClient } from "../models/greptimedb_client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.join(__dirname, "..", "..", "evaluation");
const RETRIEVAL_TIMEOUT_MS = Number(process.env.RETRIEVAL_TIMEOUT_MS || 8_000);

interface Query {
  id: string;
  query: string;
  context: Record<string, unknown>;
}

interface RetrievalQuery {
  id: string;
  query: string;
  store: "supabase" | "greptime" | "hybrid";
  expected_paths?: string[];
  expected_ids?: string[];
  filter?: { ast_kind?: string; tags?: string[] };
}

interface Response {
  query_id: string;
  input: string;
  output: string;
  tool_calls: string[];
  timestamp: string;
  duration_ms: number;
}

interface ExpectedResponse {
  query_id: string;
  expected: {
    tool_calls: string[];
    command_contains?: string[];
    success: boolean;
    output_contains?: string[];
    file_created?: string;
    file_contains?: string;
    output_is_number?: boolean;
  };
}

interface RetrievalResult {
  query_id: string;
  recall_at_5: number;
  hits: string[];
  expected: string[];
}

function loadQueries(): Query[] {
  const queriesPath = path.join(EVAL_DIR, "queries.json");
  return JSON.parse(fs.readFileSync(queriesPath, "utf-8"));
}

function loadRetrievalQueries(): RetrievalQuery[] {
  const queriesPath = path.join(EVAL_DIR, "queries.json");
  const all = JSON.parse(fs.readFileSync(queriesPath, "utf-8")) as Array<
    Query & Partial<RetrievalQuery>
  >;
  return all.filter((q) => q.store != null) as RetrievalQuery[];
}

function loadExpectedResponses(): ExpectedResponse[] {
  const expectedPath = path.join(EVAL_DIR, "expected-responses.json");
  return JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
}

function isOfflineRetrieval(): boolean {
  return (
    process.env.USE_LOCAL_EMBEDDINGS === "true" &&
    process.env.RETRIEVAL_USE_LIVE_SUPABASE !== "true"
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function reciprocalRankFusion(
  lists: Array<Array<{ id: string; score: number }>>,
  k = 60
): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const rrf = 1 / (k + rank + 1);
      scores.set(item.id, (scores.get(item.id) || 0) + rrf);
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

async function embedQuery(text: string): Promise<number[]> {
  if (process.env.USE_LOCAL_EMBEDDINGS === "true") {
    const hash = [...text].reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
  }
  try {
    const { pipeline } = await import("@xenova/transformers");
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  } catch {
    const hash = [...text].reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
  }
}

async function searchGreptime(
  query: string,
  topK: number,
  filter?: { ast_kind?: string }
): Promise<Array<{ id: string; path: string; score: number }>> {
  return withTimeout(
    (async () => {
      try {
        const embedding = await embedQuery(query);
        const results = await greptimeClient.searchTopK(embedding, topK, 500, {
          astKind: filter?.ast_kind,
        });
        return results.map((r, i) => ({ id: r.id, path: r.path, score: 1 / (i + 1) }));
      } catch {
        return [];
      }
    })(),
    RETRIEVAL_TIMEOUT_MS,
    []
  );
}

async function searchSupabaseMock(
  query: string,
  topK: number
): Promise<Array<{ id: string; path: string; score: number }>> {
  if (isOfflineRetrieval()) return [];

  return withTimeout(
    (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return [];

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, key);
        const embedding = await embedQuery(query);

        const { data, error } = await supabase.rpc("match_inbox_entries", {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: topK,
        });

        if (error || !data) return [];
        return (data as Array<{ id: string; source_file: string; similarity: number }>).map(
          (row) => ({
            id: row.id,
            path: row.source_file,
            score: row.similarity,
          })
        );
      } catch {
        return [];
      }
    })(),
    RETRIEVAL_TIMEOUT_MS,
    []
  );
}

async function hybridRetrieve(
  query: string,
  topK: number,
  filter?: { ast_kind?: string }
): Promise<Array<{ id: string; path: string }>> {
  try {
    const greptime = await searchGreptime(query, topK, filter);
    const supabase = await searchSupabaseMock(query, topK);

    const fused = reciprocalRankFusion([
      greptime.map((r) => ({ id: r.id, score: r.score })),
      supabase.map((r) => ({ id: r.id, score: r.score })),
    ]);

    const byId = new Map<string, string>();
    for (const r of [...greptime, ...supabase]) {
      byId.set(r.id, r.path);
    }

    return fused.slice(0, topK).map((f) => ({ id: f.id, path: byId.get(f.id) || f.id }));
  } catch {
    return [];
  }
}

function recallAtK(retrieved: string[], expected: string[], k = 5): number {
  if (!expected.length) return 0;
  const top = retrieved.slice(0, k);
  const hits = expected.filter((e) =>
    top.some((r) => r.includes(e) || e.includes(r))
  ).length;
  return hits / expected.length;
}

async function runRetrievalEval(): Promise<RetrievalResult[]> {
  const queries = loadRetrievalQueries();
  const results: RetrievalResult[] = [];

  for (const q of queries) {
    try {
      let hits: Array<{ id: string; path: string }> = [];
      if (q.store === "greptime") {
        const g = await searchGreptime(q.query, 5, q.filter);
        hits = g.map((r) => ({ id: r.id, path: r.path }));
      } else if (q.store === "supabase") {
        const s = await searchSupabaseMock(q.query, 5);
        hits = s.map((r) => ({ id: r.id, path: r.path }));
      } else {
        hits = await hybridRetrieve(q.query, 5, q.filter);
      }

      const retrieved = hits.map((h) => h.path || h.id);
      const expected = [...(q.expected_paths || []), ...(q.expected_ids || [])];
      const recall = recallAtK(retrieved, expected, 5);

      results.push({
        query_id: q.id,
        recall_at_5: recall,
        hits: retrieved,
        expected,
      });

      console.log(
        `${recall >= 0.5 ? "✅" : "❌"} ${q.id} Recall@5=${(recall * 100).toFixed(0)}%`
      );
    } catch (err) {
      console.warn(`[retrieval] ${q.id} failed:`, (err as Error).message);
      results.push({
        query_id: q.id,
        recall_at_5: 0,
        hits: [],
        expected: [...(q.expected_paths || []), ...(q.expected_ids || [])],
      });
    }
  }

  const outPath = path.join(EVAL_DIR, "retrieval-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved retrieval results to ${outPath}`);
  return results;
}

async function runAgent(query: string): Promise<{
  output: string;
  tool_calls: string[];
  duration_ms: number;
}> {
  const startTime = Date.now();
  return {
    output: `Executed query: ${query}`,
    tool_calls: ["bash"],
    duration_ms: Date.now() - startTime,
  };
}

function evaluateResponse(
  response: Response,
  expected: ExpectedResponse
): { passed: boolean; metrics: Record<string, boolean> } {
  const metrics: Record<string, boolean> = {};
  metrics.tool_calls_correct = expected.expected.tool_calls.every((tool) =>
    response.tool_calls.includes(tool)
  );

  if (expected.expected.command_contains) {
    metrics.command_contains = expected.expected.command_contains.every((part) =>
      response.output.toLowerCase().includes(part.toLowerCase())
    );
  }

  if (expected.expected.output_contains) {
    metrics.output_contains = expected.expected.output_contains.every((part) =>
      response.output.toLowerCase().includes(part.toLowerCase())
    );
  }

  if (expected.expected.file_created) {
    metrics.file_created = fs.existsSync(expected.expected.file_created);
    if (metrics.file_created && expected.expected.file_contains) {
      const content = fs.readFileSync(expected.expected.file_created, "utf-8");
      metrics.file_contains = content.includes(expected.expected.file_contains);
    }
  }

  if (expected.expected.output_is_number) {
    metrics.output_is_number = !Number.isNaN(parseInt(response.output.trim(), 10));
  }

  const passed = Object.values(metrics).every((v) => v);
  return { passed, metrics };
}

async function main() {
  const retrievalOnly = process.argv.includes("--retrieval-only");

  if (retrievalOnly) {
    console.log("🔍 Hybrid Retrieval Evaluation (Recall@5)\n");
    const results = await runRetrievalEval();
    const avg =
      results.reduce((s, r) => s + r.recall_at_5, 0) / Math.max(results.length, 1);
    console.log(`\n📈 Mean Recall@5: ${(avg * 100).toFixed(1)}%`);
    process.exit(avg >= 0.2 ? 0 : 1);
  }

  console.log("🚀 Starting Evaluation Runner\n");

  const queries = loadQueries().filter((q) => !(q as Query & { store?: string }).store);
  const expectedResponses = loadExpectedResponses();
  const responses: Response[] = [];

  console.log(`📋 Loaded ${queries.length} agent test queries\n`);

  for (const query of queries) {
    console.log(`🔄 Processing query ${query.id}: "${query.query}"`);
    const { output, tool_calls, duration_ms } = await runAgent(query.query);
    responses.push({
      query_id: query.id,
      input: query.query,
      output,
      tool_calls,
      timestamp: new Date().toISOString(),
      duration_ms,
    });
    console.log(`  ✓ Completed in ${duration_ms}ms\n`);
  }

  const responsesPath = path.join(EVAL_DIR, "responses.json");
  fs.writeFileSync(responsesPath, JSON.stringify(responses, null, 2));

  let passedCount = 0;
  for (const response of responses) {
    const expected = expectedResponses.find((e) => e.query_id === response.query_id);
    if (!expected) continue;
    const { passed } = evaluateResponse(response, expected);
    if (passed) passedCount++;
  }

  console.log(`\n📈 Agent Accuracy: ${((passedCount / queries.length) * 100).toFixed(1)}%`);

  console.log("\n🔍 Running retrieval eval...\n");
  await runRetrievalEval();
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
