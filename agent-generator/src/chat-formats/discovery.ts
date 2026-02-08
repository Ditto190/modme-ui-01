/**
 * chat-formats/discovery.ts
 *
 * Discovery step for the Universal Chat Ingestion pipeline.
 *
 * When format detection FAILS (unknown chat format), this module:
 *   1. Generates a structural sample of the unknown JSON
 *   2. Deep-inspects the first turn (full key paths, types, nesting depth)
 *   3. Saves the sample + diagnostic to a known folder for offline analysis
 *   4. Returns the diagnostic so the caller (n8n, bridge) can log it
 *
 * The saved samples are what the schema-crawler processes offline to
 * generate new ChatFormatDescriptors — closing the feedback loop.
 *
 * This module does NOT call any LLM. It produces the INPUT for AI.
 */

import { getByPath } from './fingerprint';

// ============================================================================
// TYPES
// ============================================================================

export interface StructuralSample {
  /** ISO 8601 timestamp when the sample was created */
  sampledAt: string;
  /** SHA-like fingerprint of the data (for dedup) */
  contentHash: string;
  /** Source filename or label (if provided by caller) */
  sourceLabel: string;
  /** Top-level JSON structure: key → type description */
  topLevelSchema: Record<string, string>;
  /** If there's a candidate "turns" array, deep sample of first item */
  firstTurnSchema: Record<string, string> | null;
  /** Path to the candidate turns array (best guess) */
  candidateTurnsPath: string | null;
  /** Number of items in the candidate turns array */
  candidateTurnsCount: number;
  /** Full diagnostic text from fingerprint engine */
  diagnosticText: string;
  /** The actual first turn data (truncated strings) for the schema-crawler */
  firstTurnSample: any | null;
  /** Nested key map: all paths found up to depth 5 with their types */
  deepKeyMap: Array<{ path: string; type: string; sample?: string }>;
}

export interface DiscoveryResult {
  /** Whether the sample was successfully created */
  sampled: boolean;
  /** The structural sample */
  sample: StructuralSample | null;
  /** Serialized JSON ready to write to disk */
  sampleJson: string;
  /** Suggested filename for the sample */
  suggestedFilename: string;
  /** Errors during sampling (non-fatal) */
  errors: string[];
}

// ============================================================================
// STRUCTURAL ANALYSIS — recursively maps JSON structure
// ============================================================================

/**
 * Describe the type of a value for schema documentation.
 */
function describeType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array[0]';
    return `array[${value.length}]<${describeType(value[0])}>`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length <= 5) return `object{${keys.join(',')}}`;
    return `object{${keys.slice(0, 5).join(',')},...+${keys.length - 5}}`;
  }
  if (typeof value === 'string') {
    if (value.length > 50) return `string(${value.length}chars)`;
    return `string`;
  }
  return typeof value;
}

/**
 * Recursively map all key paths in a JSON object up to a max depth.
 * Returns an array of {path, type, sample?} entries.
 */
function mapDeepKeys(
  obj: any,
  prefix: string = '',
  maxDepth: number = 5,
  currentDepth: number = 0
): Array<{ path: string; type: string; sample?: string }> {
  if (currentDepth >= maxDepth) return [];
  if (obj === null || obj === undefined) return [];

  const entries: Array<{ path: string; type: string; sample?: string }> = [];

  if (typeof obj !== 'object') return [];

  const keys = Array.isArray(obj) ? ['[0]'] : Object.keys(obj);
  const target = Array.isArray(obj) ? { '[0]': obj[0] } : obj;

  for (const key of keys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = target[key];

    const entry: { path: string; type: string; sample?: string } = {
      path: fullPath,
      type: describeType(value),
    };

    // Include a sample for string values (truncated)
    if (typeof value === 'string' && value.length > 0) {
      entry.sample = value.slice(0, 100);
    }

    entries.push(entry);

    // Recurse into objects and first array element
    if (typeof value === 'object' && value !== null) {
      const childObj = Array.isArray(value) && value.length > 0 ? value[0] : value;
      const childPrefix = Array.isArray(value) ? `${fullPath}[0]` : fullPath;

      if (!Array.isArray(value)) {
        entries.push(...mapDeepKeys(value, fullPath, maxDepth, currentDepth + 1));
      } else if (value.length > 0) {
        entries.push(...mapDeepKeys(childObj, childPrefix, maxDepth, currentDepth + 1));
      }
    }
  }

  return entries;
}

/**
 * Truncate string values in an object for safe sampling.
 * Deep-clones the object with all strings cut to maxLen.
 */
function truncateStrings(obj: any, maxLen: number = 200): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj.slice(0, maxLen);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) {
    return obj.slice(0, 3).map((item) => truncateStrings(item, maxLen));
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateStrings(value, maxLen);
    }
    return result;
  }
  return obj;
}

/**
 * Simple content hash for deduplication.
 * Uses top-level keys + array lengths to create a stable signature.
 */
function computeContentHash(data: any): string {
  const keys = Object.keys(data || {}).sort();
  const sig = keys.map((k) => {
    const v = data[k];
    if (Array.isArray(v)) return `${k}:arr${v.length}`;
    return `${k}:${typeof v}`;
  }).join('|');

  // Simple hash (not crypto, just for dedup)
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    const ch = sig.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

// ============================================================================
// CANDIDATE DETECTION — guess which field holds the conversation turns
// ============================================================================

/**
 * Heuristically find the "turns" array in an unknown format.
 *
 * Strategy:
 *   1. Look for top-level arrays with objects as elements
 *   2. Prefer arrays with common chat field names (message, content, text, role)
 *   3. Pick the largest qualifying array
 */
function findCandidateTurnsPath(data: any): { path: string; count: number } | null {
  if (!data || typeof data !== 'object') return null;

  /** Known field names that suggest "this is a turns/messages array" */
  const chatMarkers = [
    'message', 'content', 'text', 'role', 'user', 'assistant',
    'response', 'request', 'prompt', 'completion', 'input', 'output',
  ];

  let bestPath: string | null = null;
  let bestScore = 0;
  let bestCount = 0;

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0];
    if (typeof first !== 'object' || first === null) continue;

    const firstKeys = Object.keys(first).map((k) => k.toLowerCase());
    let score = value.length; // Base score = array length

    // Bonus for chat-related field names
    for (const marker of chatMarkers) {
      if (firstKeys.some((k) => k.includes(marker))) {
        score += 100;
      }
    }

    // Bonus for specific path names
    const keyLower = key.toLowerCase();
    if (['messages', 'requests', 'turns', 'conversation', 'exchanges', 'chat'].includes(keyLower)) {
      score += 200;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPath = key;
      bestCount = value.length;
    }
  }

  return bestPath ? { path: bestPath, count: bestCount } : null;
}

// ============================================================================
// MAIN DISCOVERY FUNCTION
// ============================================================================

/**
 * Generate a structural sample from unknown chat data.
 *
 * This is the discovery step: when format detection fails,
 * call this to produce a sample for offline analysis.
 *
 * @param data - The raw chat JSON that failed detection
 * @param diagnosticText - The diagnostic from the fingerprint engine
 * @param sourceLabel - Optional label (e.g., filename) for the sample
 */
export function generateDiscoverySample(
  data: any,
  diagnosticText: string,
  sourceLabel: string = 'unknown'
): DiscoveryResult {
  const errors: string[] = [];

  try {
    // Top-level schema
    const topLevelSchema: Record<string, string> = {};
    for (const [key, value] of Object.entries(data || {})) {
      topLevelSchema[key] = describeType(value);
    }

    // Find candidate turns array
    const candidate = findCandidateTurnsPath(data);

    // Deep sample first turn
    let firstTurnSchema: Record<string, string> | null = null;
    let firstTurnSample: any = null;

    if (candidate) {
      const turns = getByPath(data, candidate.path);
      if (Array.isArray(turns) && turns.length > 0) {
        const firstTurn = turns[0];
        firstTurnSchema = {};
        for (const [key, value] of Object.entries(firstTurn)) {
          firstTurnSchema[key] = describeType(value);
        }
        // Save a truncated copy for the schema-crawler
        firstTurnSample = truncateStrings(firstTurn, 200);
      }
    }

    // Deep key map of entire structure
    const deepKeyMap = mapDeepKeys(data, '', 5);

    // Content hash for dedup
    const contentHash = computeContentHash(data);

    // Build the sample
    const now = new Date();
    const sample: StructuralSample = {
      sampledAt: now.toISOString(),
      contentHash,
      sourceLabel,
      topLevelSchema,
      firstTurnSchema,
      candidateTurnsPath: candidate?.path || null,
      candidateTurnsCount: candidate?.count || 0,
      diagnosticText,
      firstTurnSample,
      deepKeyMap,
    };

    // Generate filename
    const datePart = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const suggestedFilename = `unknown-${sourceLabel}-${datePart}-${contentHash.slice(0, 6)}.json`;

    return {
      sampled: true,
      sample,
      sampleJson: JSON.stringify(sample, null, 2),
      suggestedFilename,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Discovery sampling failed: ${msg}`);
    return {
      sampled: false,
      sample: null,
      sampleJson: '{}',
      suggestedFilename: 'error-sample.json',
      errors,
    };
  }
}
