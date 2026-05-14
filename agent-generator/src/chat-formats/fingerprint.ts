/**
 * chat-formats/fingerprint.ts
 *
 * Pure-code fingerprint engine. Zero LLM calls.
 *
 * Iterates the ChatFormatRegistry, applies fingerprint rules against
 * incoming JSON data, and returns the matched format descriptor.
 *
 * The fingerprint rules are Zod-generated from JSON Schema descriptors.
 * Each rule checks a structural property of the chat data.
 */

import type {
  ChatFormatDescriptor,
  ChatFormatRegistry,
  DetectionResult,
  FingerprintRule,
} from './types';

// ============================================================================
// PATH RESOLVER — walks dot-notation paths into nested objects
// ============================================================================

/**
 * Resolve a dot-notation path against a JSON object.
 *
 * Examples:
 *   getByPath(obj, "name")                   → obj.name
 *   getByPath(obj, "result.metadata.sessionId") → obj.result.metadata.sessionId
 *   getByPath(obj, "requests[0].message")    → obj.requests[0].message
 *
 * Returns undefined if any part of the path doesn't exist.
 */
export function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }

  return current;
}

// ============================================================================
// FINGERPRINT RULE EVALUATOR
// ============================================================================

/**
 * Evaluate a single fingerprint rule against the data.
 */
export function evaluateRule(data: any, rule: FingerprintRule): boolean {
  const value = getByPath(data, rule.path);

  switch (rule.check) {
    case 'exists':
      return value !== undefined && value !== null;

    case 'type_string':
      return typeof value === 'string';

    case 'type_number':
      return typeof value === 'number';

    case 'type_array':
      return Array.isArray(value);

    case 'type_object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);

    case 'equals':
      return value === rule.value;

    case 'matches':
      if (typeof value !== 'string' || typeof rule.value !== 'string') return false;
      try {
        return new RegExp(rule.value).test(value);
      } catch {
        return false;
      }

    case 'has_key':
      if (typeof value !== 'object' || value === null) return false;
      return typeof rule.value === 'string' && rule.value in value;

    default:
      return false;
  }
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/**
 * Run all fingerprint rules for a single format descriptor.
 * ALL rules must pass for a match (AND logic).
 */
export function matchFormat(
  data: any,
  descriptor: ChatFormatDescriptor
): DetectionResult {
  const ruleResults = descriptor.fingerprint.map((rule) => ({
    rule,
    passed: evaluateRule(data, rule),
  }));

  const allPassed = ruleResults.every((r) => r.passed);
  const somePassed = ruleResults.some((r) => r.passed);

  return {
    matched: allPassed,
    formatId: allPassed ? descriptor.id : null,
    descriptor: allPassed ? descriptor : null,
    confidence: allPassed ? 'exact' : somePassed ? 'partial' : 'none',
    ruleResults,
  };
}

/**
 * Detect the chat format from the registry.
 *
 * Iterates all format descriptors (sorted by priority, highest first).
 * Returns the first exact match, or a diagnostic report if none match.
 */
export function detectFormat(
  data: any,
  registry: ChatFormatRegistry
): DetectionResult {
  // Sort by priority descending (higher priority checked first)
  const sorted = [...registry.formats].sort((a, b) => b.priority - a.priority);

  let bestPartial: DetectionResult | null = null;

  for (const descriptor of sorted) {
    const result = matchFormat(data, descriptor);

    if (result.matched) {
      return result;
    }

    // Track the best partial match for diagnostics
    if (result.confidence === 'partial') {
      const passedCount = result.ruleResults.filter((r) => r.passed).length;
      const bestPassedCount = bestPartial
        ? bestPartial.ruleResults.filter((r) => r.passed).length
        : 0;

      if (passedCount > bestPassedCount) {
        bestPartial = result;
      }
    }
  }

  // No exact match — return best partial or empty result
  return bestPartial || {
    matched: false,
    formatId: null,
    descriptor: null,
    confidence: 'none',
    ruleResults: [],
  };
}

/**
 * Generate a diagnostic report when detection fails.
 * Useful for the AI to analyze and create a new format descriptor.
 */
export function generateDiagnostic(
  data: any,
  registry: ChatFormatRegistry
): string {
  const topLevelKeys = Object.keys(data || {});
  const topLevelTypes = Object.fromEntries(
    topLevelKeys.map((k) => [
      k,
      Array.isArray(data[k])
        ? `array[${data[k].length}]`
        : typeof data[k],
    ])
  );

  const lines: string[] = [
    '=== Chat Format Detection Diagnostic ===',
    '',
    'Top-level structure:',
    JSON.stringify(topLevelTypes, null, 2),
    '',
    'Attempted formats:',
  ];

  for (const fmt of registry.formats) {
    const result = matchFormat(data, fmt);
    const passed = result.ruleResults.filter((r) => r.passed).length;
    const total = result.ruleResults.length;
    lines.push(`  ${fmt.id}: ${passed}/${total} rules passed`);

    for (const rr of result.ruleResults) {
      const icon = rr.passed ? '✓' : '✗';
      lines.push(`    ${icon} ${rr.rule.path} [${rr.rule.check}]`);
    }
  }

  // Sample first item if there's an array field
  const arrayFields = topLevelKeys.filter((k) => Array.isArray(data[k]) && data[k].length > 0);
  if (arrayFields.length > 0) {
    lines.push('');
    lines.push('Sample array items (first element keys):');
    for (const field of arrayFields) {
      const first = data[field][0];
      if (typeof first === 'object' && first !== null) {
        lines.push(`  ${field}[0]: ${JSON.stringify(Object.keys(first))}`);
      }
    }
  }

  return lines.join('\n');
}
