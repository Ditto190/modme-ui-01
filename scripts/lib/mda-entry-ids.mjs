/**
 * Parse and validate the optional ENTRY_IDS selector for mda-categorize.mjs.
 *
 * - unset or "" -> [] (caller uses the default indexed batch)
 * - anything else must be comma-separated UUIDs (horizontal blanks around items allowed);
 *   otherwise throws EntryIdsError. Malformed input never falls back to the default batch.
 */

export const MAX_ENTRY_IDS = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EntryIdsError extends Error {
  constructor(message) {
    super(message);
    this.name = "EntryIdsError";
  }
}

export function parseEntryIds(raw) {
  if (raw === undefined || raw === null || raw === "") return [];
  const value = String(raw);
  if (/[\r\n]/.test(value)) {
    throw new EntryIdsError("ENTRY_IDS must be a single line of comma-separated UUIDs");
  }
  const items = value.split(",").map((s) => s.replace(/^[ \t]+|[ \t]+$/g, ""));
  const bad = items.filter((id) => !UUID_RE.test(id));
  if (bad.length) {
    const shown = bad
      .slice(0, 5)
      .map((b) => JSON.stringify(b.slice(0, 64)))
      .join(", ");
    throw new EntryIdsError(
      `ENTRY_IDS must be comma-separated UUIDs; invalid item(s): ${shown}${bad.length > 5 ? ", ..." : ""}`
    );
  }
  const ids = Array.from(new Set(items.map((id) => id.toLowerCase())));
  if (ids.length > MAX_ENTRY_IDS) {
    throw new EntryIdsError(`ENTRY_IDS has ${ids.length} IDs; maximum is ${MAX_ENTRY_IDS}`);
  }
  return ids;
}

/** IDs requested but absent from the query result (missing, not indexed, or truncated). */
export function missingEntryIds(requested, rows) {
  const found = new Set((rows ?? []).map((r) => String(r.id).toLowerCase()));
  return requested.filter((id) => !found.has(id));
}
