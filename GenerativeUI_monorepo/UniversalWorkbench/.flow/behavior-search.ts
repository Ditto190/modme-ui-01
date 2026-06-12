#!/usr/bin/env tsx
/**
 * Behavior Search Script
 *
 * Search for behaviors by pattern (domain, entity, or glob)
 * Examples:
 *   yarn behavior:search TASK.*
 *   yarn behavior:search *.CREATE
 *   yarn behavior:search TEAM.MEMBER.*
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Behavior {
  id: string;
  domain: string;
  entity: string;
  operation: string;
  qualifiers: Array<string>;
  layers: Array<string>;
  dependencies: Array<string>;
  implements: Array<string>;
  files: Array<string>;
  tests: Array<string>;
}

interface BehaviorRegistry {
  version: string;
  generated: string;
  behaviors: Record<string, Behavior>;
}

const WORKSPACE_ROOT = process.cwd();

/**
 * Convert glob pattern to regex
 * Supports * as wildcard
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*/g, '.*'); // Convert * to .*

  return new RegExp(`^${escaped}$`);
}

/**
 * Match behavior ID against pattern
 */
function matchesPattern(behaviorId: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(behaviorId);
}

/**
 * Format a list with header
 */
function formatList(header: string, items: Array<string>): string {
  if (items.length === 0) {
    return '';
  }
  let output = `\n   ${header}:`;
  for (const item of items) {
    output += `\n     - ${item}`;
  }
  return output;
}

/**
 * Format basic behavior metadata
 */
function formatBasicMetadata(behavior: Behavior): string {
  let output = `\n   Domain: ${behavior.domain}`;
  output += `\n   Entity: ${behavior.entity}`;
  output += `\n   Operation: ${behavior.operation}`;

  if (behavior.qualifiers.length > 0) {
    output += `\n   Qualifiers: ${behavior.qualifiers.join(', ')}`;
  }
  if (behavior.layers.length > 0) {
    output += `\n   Layers: ${behavior.layers.join(', ')}`;
  }

  return output;
}

/**
 * Format behavior for display
 */
function formatBehavior(behavior: Behavior, verbose: boolean): string {
  let output = `\n📦 ${behavior.id}`;

  if (verbose) {
    output += formatBasicMetadata(behavior);
    output += formatList('Dependencies', behavior.dependencies);
    output += formatList('Implements', behavior.implements);
    output += formatList('Files', behavior.files);
    output += formatList('Tests', behavior.tests);
  }

  return output;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: yarn behavior:search <pattern> [--verbose]');
    console.log('');
    console.log('Examples:');
    console.log('  yarn behavior:search TASK.*           # All TASK domain behaviors');
    console.log('  yarn behavior:search *.CREATE         # All CREATE operations');
    console.log('  yarn behavior:search TEAM.MEMBER.*    # All TEAM.MEMBER behaviors');
    console.log('  yarn behavior:search AUTH.* --verbose # Verbose output');
    console.log('');
    process.exit(0);
  }

  const pattern = args[0];
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Load behaviors.json
  const registryPath = join(WORKSPACE_ROOT, 'behaviors.json');
  let registry: BehaviorRegistry;

  try {
    const content = await readFile(registryPath, 'utf-8');
    registry = JSON.parse(content) as BehaviorRegistry;
  } catch (_error) {
    process.exit(1);
  }

  // Search behaviors
  const matches: Array<Behavior> = [];

  for (const behavior of Object.values(registry.behaviors)) {
    if (matchesPattern(behavior.id, pattern)) {
      matches.push(behavior);
    }
  }

  // Display results
  console.log(`🔍 Searching for: ${pattern}`);
  console.log(`📊 Found ${matches.length} matching behavior${matches.length === 1 ? '' : 's'}`);

  if (matches.length === 0) {
    console.log('');
    console.log('Try broader patterns:');
    console.log('  - Use * as wildcard (e.g., TASK.*)');
    console.log('  - Search by operation (e.g., *.CREATE)');
    console.log('  - List all behaviors: yarn behavior:search *');
    console.log('');
    process.exit(0);
  }

  // Sort by ID
  matches.sort((a, b) => a.id.localeCompare(b.id));

  for (const behavior of matches) {
    console.log(formatBehavior(behavior, verbose));
  }

  console.log('');
}

main().catch((_error: unknown) => {
  process.exit(1);
});
