import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EntryIdsError,
  MAX_ENTRY_IDS,
  MAX_IDS_PER_IN_CHUNK,
  MAX_IN_FILTER_URL_BYTES,
  TAXONOMY_IN_FILTER_BASE,
  chunkIdsForInFilter,
  estimateInFilterUrlBytes,
  missingEntryIds,
  parseEntryIds,
} from "../lib/mda-entry-ids.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../mda-categorize.mjs");
const A = "0b6f3c2e-1d4a-4f5b-9c8d-7e6f5a4b3c2d";
const B = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function uuid(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
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
    assert.deepEqual(chunkIdsForInFilter([]), []);
  });

  it("keeps a single ID in one chunk", () => {
    assert.deepEqual(chunkIdsForInFilter([A]), [[A]]);
    assert.ok(estimateInFilterUrlBytes([A]) <= MAX_IN_FILTER_URL_BYTES);
  });

  it("keeps 500 UUIDs under the URL budget by splitting before the 16 KB limit", () => {
    const ids = Array.from({ length: 500 }, (_, i) => uuid(i));
    const chunks = chunkIdsForInFilter(ids);
    assert.ok(chunks.length >= 2, `expected URL-driven split, got ${chunks.length} chunk(s)`);
    assert.equal(chunks.flat().length, 500);
    for (const c of chunks) {
      assert.ok(c.length <= MAX_IDS_PER_IN_CHUNK);
      assert.ok(
        estimateInFilterUrlBytes(c) <= MAX_IN_FILTER_URL_BYTES,
        `chunk of ${c.length} estimated ${estimateInFilterUrlBytes(c)} bytes`
      );
    }
  });

  it("splits 501 IDs into at least two chunks of ≤500", () => {
    const ids = Array.from({ length: 501 }, (_, i) => uuid(i));
    const chunks = chunkIdsForInFilter(ids);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.every((c) => c.length <= MAX_IDS_PER_IN_CHUNK));
    assert.equal(chunks.flat().length, 501);
    for (const c of chunks) {
      assert.ok(estimateInFilterUrlBytes(c) <= MAX_IN_FILTER_URL_BYTES);
    }
  });

  it("splits many long IDs so each chunk stays under the URL-length bound", () => {
    // Long synthetic IDs (not UUIDs) exercise the byte budget without going through parseEntryIds.
    const long = Array.from({ length: 40 }, (_, i) => `long-id-${i}-` + "x".repeat(400));
    const chunks = chunkIdsForInFilter(long, { maxIds: MAX_IDS_PER_IN_CHUNK, maxBytes: MAX_IN_FILTER_URL_BYTES });
    assert.ok(chunks.length >= 2, `expected several chunks, got ${chunks.length}`);
    assert.equal(chunks.flat().length, 40);
    for (const c of chunks) {
      const bytes = estimateInFilterUrlBytes(c);
      assert.ok(bytes <= MAX_IN_FILTER_URL_BYTES, `chunk bytes ${bytes}`);
      assert.ok(c.length <= MAX_IDS_PER_IN_CHUNK);
    }
  });

  it("honours a tight maxIds even when the URL budget would allow more", () => {
    const ids = Array.from({ length: 10 }, (_, i) => uuid(i));
    assert.deepEqual(
      chunkIdsForInFilter(ids, { maxIds: 3 }).map((c) => c.length),
      [3, 3, 3, 1]
    );
  });

  it("throws when a single ID alone exceeds the URL budget", () => {
    const huge = "y".repeat(MAX_IN_FILTER_URL_BYTES);
    assert.throws(() => chunkIdsForInFilter([huge]), EntryIdsError);
  });

  it("estimate matches base + joined length", () => {
    assert.equal(estimateInFilterUrlBytes([]), TAXONOMY_IN_FILTER_BASE.length);
    assert.equal(estimateInFilterUrlBytes([A, B]), TAXONOMY_IN_FILTER_BASE.length + A.length + 1 + B.length);
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
