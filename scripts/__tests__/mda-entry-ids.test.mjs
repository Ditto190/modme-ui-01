import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EntryIdsError,
  IN_FILTER_HEADERS_RESERVE_BYTES,
  IN_FILTER_ORIGIN_EXAMPLE,
  MAX_ENTRY_IDS,
  MAX_IDS_PER_IN_CHUNK,
  MAX_IN_FILTER_URL_BYTES,
  TAXONOMY_IN_FILTER_BASE,
  chunkIdsForInFilter,
  estimateInFilterUrlBytes,
  inFilterUrlBudget,
  missingEntryIds,
  parseEntryIds,
} from "../lib/mda-entry-ids.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../mda-categorize.mjs");
const A = "0b6f3c2e-1d4a-4f5b-9c8d-7e6f5a4b3c2d";
const B = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const URL_BUDGET = inFilterUrlBudget();

function uuid(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function assertChunksPreserve(ids, chunks) {
  assert.deepEqual(chunks.flat(), ids);
  for (const c of chunks) {
    assert.ok(c.length <= MAX_IDS_PER_IN_CHUNK);
    assert.ok(
      estimateInFilterUrlBytes(c) <= URL_BUDGET,
      `chunk of ${c.length} estimated ${estimateInFilterUrlBytes(c)} > budget ${URL_BUDGET}`
    );
  }
}

describe("parseEntryIds", () => {
  it("returns [] for unset or empty (default batch)", () => {
    assert.deepEqual(parseEntryIds(undefined), []);
    assert.deepEqual(parseEntryIds(""), []);
  });

  it("accepts comma-separated UUIDs with blanks, dedupes, lowercases", () => {
    assert.deepEqual(parseEntryIds(`${A}`), [A]);
    assert.deepEqual(parseEntryIds(` ${A} ,\t${B.toUpperCase()} , ${A}`), [A, B]);
  });

  for (const [label, raw] of [
    ["comma only", ","],
    ["blank only", "   "],
    ["empty item", `${A},,${B}`],
    ["trailing comma", `${A},`],
    ["non-UUID", "abc"],
    ["mixed valid and invalid", `${A},not-a-uuid`],
    ["newline", `${A}\n${B}`],
    ["shell metachar", `${A};touch /tmp/x`],
  ]) {
    it(`rejects malformed input: ${label}`, () => {
      assert.throws(() => parseEntryIds(raw), EntryIdsError);
    });
  }

  it(`rejects more than ${MAX_ENTRY_IDS} IDs`, () => {
    const many = Array.from({ length: MAX_ENTRY_IDS + 1 }, (_, i) => uuid(i)).join(",");
    assert.throws(() => parseEntryIds(many), /maximum/);
  });
});

describe("missingEntryIds", () => {
  it("reports requested IDs absent from the result", () => {
    assert.deepEqual(missingEntryIds([A, B], [{ id: A.toUpperCase() }]), [B]);
    assert.deepEqual(missingEntryIds([A], [{ id: A }]), []);
    assert.deepEqual(missingEntryIds([A], null), [A]);
  });
});

describe("chunkIdsForInFilter", () => {
  it("returns [] for 0 IDs", () => {
    const chunks = chunkIdsForInFilter([]);
    assert.deepEqual(chunks, []);
    assertChunksPreserve([], chunks);
  });

  it("keeps a single ID in one chunk", () => {
    const ids = [A];
    const chunks = chunkIdsForInFilter(ids);
    assert.deepEqual(chunks, [[A]]);
    assertChunksPreserve(ids, chunks);
  });

  it("keeps 500 UUIDs under the encoded URL budget by splitting", () => {
    const ids = Array.from({ length: 500 }, (_, i) => uuid(i));
    const chunks = chunkIdsForInFilter(ids);
    assert.ok(chunks.length >= 2, `expected URL-driven split, got ${chunks.length} chunk(s)`);
    assertChunksPreserve(ids, chunks);
  });

  it("splits 501 IDs into at least two chunks of ≤500 and preserves IDs", () => {
    const ids = Array.from({ length: 501 }, (_, i) => uuid(i));
    const chunks = chunkIdsForInFilter(ids);
    assert.ok(chunks.length >= 2);
    assertChunksPreserve(ids, chunks);
  });

  it("splits many long IDs so each chunk stays under the URL-length bound", () => {
    const long = Array.from({ length: 40 }, (_, i) => `long-id-${i}-` + "x".repeat(400));
    const chunks = chunkIdsForInFilter(long);
    assert.ok(chunks.length >= 2, `expected several chunks, got ${chunks.length}`);
    assertChunksPreserve(long, chunks);
  });

  it("honours a tight maxIds even when the URL budget would allow more", () => {
    const ids = Array.from({ length: 10 }, (_, i) => uuid(i));
    const chunks = chunkIdsForInFilter(ids, { maxIds: 3 });
    assert.deepEqual(chunks.map((c) => c.length), [3, 3, 3, 1]);
    assertChunksPreserve(ids, chunks);
  });

  it("throws when a single ID alone exceeds the URL budget", () => {
    const huge = "y".repeat(MAX_IN_FILTER_URL_BYTES);
    assert.throws(() => chunkIdsForInFilter([huge]), EntryIdsError);
  });

  it("estimate uses URLSearchParams encoding and leaves header reserve", () => {
    assert.equal(IN_FILTER_HEADERS_RESERVE_BYTES, 2048);
    assert.equal(URL_BUDGET, MAX_IN_FILTER_URL_BYTES - IN_FILTER_HEADERS_RESERVE_BYTES);
    const one = estimateInFilterUrlBytes([A]);
    const filter = "in." + encodeURIComponent("(" + A + ")");
    assert.equal(one, IN_FILTER_ORIGIN_EXAMPLE.length + TAXONOMY_IN_FILTER_BASE.length + filter.length);
    // 400 encoded UUIDs exceed the path/query budget once headers are reserved.
    const ids400 = Array.from({ length: 400 }, (_, i) => uuid(i));
    assert.ok(estimateInFilterUrlBytes(ids400) > URL_BUDGET);
    const chunks = chunkIdsForInFilter(ids400);
    assert.ok(chunks.length >= 2);
    assertChunksPreserve(ids400, chunks);
  });
});

describe("mda-categorize.mjs with malformed ENTRY_IDS", () => {
  for (const raw of [",", "abc", `${A},`, `${A}\nabc`]) {
    it(`exits non-zero before any query: ${JSON.stringify(raw)}`, () => {
      const env = { PATH: process.env.PATH, HOME: process.env.HOME, ENTRY_IDS: raw };
      const r = spawnSync(process.execPath, [SCRIPT, "--team", "taxonomy", "--dry-run"], {
        env,
        encoding: "utf8",
        timeout: 15000,
      });
      assert.equal(r.status, 2, `stdout=${r.stdout} stderr=${r.stderr}`);
      assert.match(r.stderr, /Invalid ENTRY_IDS/);
      assert.doesNotMatch(r.stdout, /Fetching|Processing|Pipeline complete/);
    });
  }
});

describe("mda-categorize.mjs targeted selection (caller-level)", () => {
  it("applies .in(id, chunk) so only requested indexed rows are processed", () => {
    const C = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f"; // unrelated indexed
    const D = "3d4e5f6a-7b8c-4d9e-0f1a-2b3c4d5e6f7a"; // requested but not indexed
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mda-target-"));
    const mockFile = path.join(tmp, "supabase-mock.mjs");
    const hookFile = path.join(tmp, "resolve-hook.mjs");
    const preloadFile = path.join(tmp, "preload.mjs");
    const fixturePath = path.join(tmp, "fixture.json");
    const tracePath = path.join(tmp, "trace.json");
    const rows = [
      { id: A, status: "indexed", title: "req-A", summary: "", extracted_text: "", tags: [], severity: "medium" },
      { id: B, status: "indexed", title: "req-B", summary: "", extracted_text: "", tags: [], severity: "medium" },
      { id: C, status: "indexed", title: "unrelated-C", summary: "", extracted_text: "", tags: [], severity: "medium" },
      { id: D, status: "archived", title: "not-indexed-D", summary: "", extracted_text: "", tags: [], severity: "medium" },
    ];
    fs.writeFileSync(fixturePath, JSON.stringify({ rows, categories: [{ id: "cat1", slug: "x", name: "X" }] }));
    fs.writeFileSync(
      mockFile,
      `import fs from "node:fs";
const fixture = JSON.parse(fs.readFileSync(process.env.MDA_TEST_FIXTURE, "utf8"));
const trace = { inCalls: [], tables: [] };
function save() { fs.writeFileSync(process.env.MDA_TEST_TRACE, JSON.stringify(trace)); }
export function createClient() {
  return {
    from(table) {
      trace.tables.push(table);
      const state = { ids: null, status: null };
      const api = {
        select() { return api; },
        in(col, vals) {
          if (col === "id") { state.ids = vals.map(String); trace.inCalls.push([...state.ids]); }
          return api;
        },
        eq(col, val) { if (col === "status") state.status = val; return api; },
        limit() { return api; },
        order() { return api; },
        not() { return api; },
        update() { return { eq() { return Promise.resolve({ error: null }); } }; },
        then(resolve, reject) {
          try {
            if (table === "categories") { save(); return resolve({ data: fixture.categories, error: null }); }
            let out = fixture.rows.slice();
            if (state.status != null) out = out.filter((r) => r.status === state.status);
            if (state.ids != null) {
              const want = new Set(state.ids.map((x) => x.toLowerCase()));
              out = out.filter((r) => want.has(String(r.id).toLowerCase()));
            }
            save();
            return resolve({ data: out, error: null });
          } catch (e) { return reject(e); }
        },
      };
      return api;
    },
  };
}
`
    );
    fs.writeFileSync(
      hookFile,
      `import { pathToFileURL } from "node:url";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@supabase/supabase-js") {
    return { shortCircuit: true, url: pathToFileURL(process.env.MDA_MOCK_SUPABASE).href };
  }
  return nextResolve(specifier, context);
}
`
    );
    fs.writeFileSync(
      preloadFile,
      `import { register } from "node:module";
import { pathToFileURL } from "node:url";
register(process.env.MDA_RESOLVE_HOOK, pathToFileURL("./"));
`
    );

    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ENTRY_IDS: `${A},${B}`,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      MDA_TEST_FIXTURE: fixturePath,
      MDA_TEST_TRACE: tracePath,
      MDA_MOCK_SUPABASE: mockFile,
      MDA_RESOLVE_HOOK: hookFile,
    };
    const r = spawnSync(
      process.execPath,
      ["--import", preloadFile, SCRIPT, "--team", "taxonomy", "--dry-run"],
      { env, encoding: "utf8", timeout: 20000 }
    );
    assert.equal(r.status, 0, `stdout=${r.stdout}\nstderr=${r.stderr}`);
    assert.match(r.stdout, /Processing 2 entries/);
    assert.ok(r.stdout.includes(`[dry-run] ${A.slice(0, 8)}`), r.stdout);
    assert.ok(r.stdout.includes(`[dry-run] ${B.slice(0, 8)}`), r.stdout);
    assert.ok(!r.stdout.includes(`[dry-run] ${C.slice(0, 8)}`), r.stdout);
    assert.doesNotMatch(r.stdout, /unrelated-C/);
    assert.match(r.stdout, /Pipeline complete/);

    const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
    assert.ok(trace.inCalls.length >= 1, "expected at least one .in(id, …) call");
    const requested = new Set([A, B]);
    for (const call of trace.inCalls) {
      for (const id of call) assert.ok(requested.has(id), `unexpected id in .in(): ${id}`);
      assert.ok(!call.includes(C), ".in() must not request unrelated C");
    }
  });
});
