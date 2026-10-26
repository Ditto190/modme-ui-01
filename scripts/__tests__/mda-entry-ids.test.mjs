import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EntryIdsError,
  MAX_ENTRY_IDS,
  missingEntryIds,
  parseEntryIds,
} from "../lib/mda-entry-ids.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../mda-categorize.mjs");
const A = "0b6f3c2e-1d4a-4f5b-9c8d-7e6f5a4b3c2d";
const B = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

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
    const many = Array.from({ length: MAX_ENTRY_IDS + 1 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
    ).join(",");
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
