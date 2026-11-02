import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
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
