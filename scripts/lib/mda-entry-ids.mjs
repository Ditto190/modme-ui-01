/**
 * Parse and validate the optional ENTRY_IDS selector for mda-categorize.mjs.
 *
 * - unset or "" -> [] (caller uses the default indexed batch)
 * - anything else must be comma-separated UUIDs (horizontal blanks around items allowed);
 *   otherwise throws EntryIdsError. Malformed input never falls back to the default batch.
 *
 * Targeted `.in()` queries are chunked so each request stays within Supabase/PostgREST
 * limits (≤500 IDs and ≤16 KB for the request URL).
 */

export const MAX_ENTRY_IDS = 500;
/** Hard cap on IDs per `.in()` chunk (also keeps under PostgREST practical limits). */
export const MAX_IDS_PER_IN_CHUNK = 500;
/**
 * Supabase documents REST failures when the URL and headers exceed ~16 KB.
 * We budget the whole request URL (path + query) under this limit.
 */
export const MAX_IN_FILTER_URL_BYTES = 16 * 1024;

/** Base path+query for the taxonomy select, with an empty `id=in.()` filter. */
export const TAXONOMY_IN_FILTER_BASE =
  "/rest/v1/inbox_entries?select=id%2Cextracted_text%2Ctitle%2Csummary%2Ctags%2Cseverity&status=eq.indexed&id=in.()";

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

/**
 * Estimate the request URL byte length for `id=in.(...)` against TAXONOMY_IN_FILTER_BASE.
 * UUIDs and commas are unreserved in query strings, so length === byte length (UTF-8).
 */
export function estimateInFilterUrlBytes(ids, base = TAXONOMY_IN_FILTER_BASE) {
  if (!ids.length) return base.length;
  // id=in.() already has the empty parens; insert comma-joined ids between them.
  return base.length + ids.join(",").length;
}

/**
 * Split IDs into chunks of ≤ maxIds whose estimated request URL stays ≤ maxBytes.
 * Empty input -> []. A single ID that alone exceeds maxBytes throws.
 */
export function chunkIdsForInFilter(
  ids,
  {
    maxIds = MAX_IDS_PER_IN_CHUNK,
    maxBytes = MAX_IN_FILTER_URL_BYTES,
    estimate = estimateInFilterUrlBytes,
  } = {}
) {
  if (!ids.length) return [];
  const chunks = [];
  let current = [];
  for (const id of ids) {
    const candidate = current.length ? [...current, id] : [id];
    const overCount = candidate.length > maxIds;
    const overBytes = estimate(candidate) > maxBytes;
    if (current.length && (overCount || overBytes)) {
      chunks.push(current);
      current = [id];
      if (estimate(current) > maxBytes) {
        throw new EntryIdsError(
          `ENTRY_ID produces an .in() filter larger than ${maxBytes} bytes`
        );
      }
    } else if (!current.length && overBytes) {
      throw new EntryIdsError(
        `ENTRY_ID produces an .in() filter larger than ${maxBytes} bytes`
      );
    } else {
      current = candidate;
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}
