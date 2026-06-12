#!/usr/bin/env tsx
/**
 * Behavior Validation Script v1.0
 *
 * Validates the code-first behavior management system:
 * 1. behaviors.json exists and is valid JSON
 * 2. All behavior IDs follow semantic taxonomy (DOMAIN.ENTITY.OPERATION)
 * 3. All referenced dependencies exist
 * 4. Status values are valid (PLANNED, IN_PROGRESS, DONE, BLOCKED, DEPRECATED)
 * 5. Priority values are valid (CRITICAL, HIGH, MEDIUM, LOW)
 * 6. taxonomy.yaml exists and is parseable
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

interface ValidationError {
  type: 'json' | 'reference' | 'taxonomy' | 'missing' | 'format';
  file: string;
  id?: string;
  message: string;
}

interface BehaviorRegistry {
  version: string;
  generated: string;
  product: string;
  behaviors: Record<
    string,
    {
      id: string;
      domain: string;
      entity: string;
      operation: string;
      status: string;
      priority: string;
      dependencies: Array<string>;
    }
  >;
}

interface Taxonomy {
  version: string;
  product: string;
  personas?: Record<string, unknown>;
  themes?: Record<string, unknown>;
  domains?: Record<string, unknown>;
}

const BEHAVIOR_DIR = '.flow';
const VALID_STATUSES = ['PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'DEPRECATED'];
const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const errors: Array<ValidationError> = [];

function addError(error: ValidationError): void {
  errors.push(error);
}

async function loadJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    addError({
      type: 'json',
      file: filePath,
      message: `Failed to load or parse JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

async function loadYaml<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch (error) {
    addError({
      type: 'missing',
      file: filePath,
      message: `Failed to load taxonomy: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function validateBehaviorId(id: string): boolean {
  // Must follow DOMAIN.ENTITY.OPERATION[.QUALIFIER]*
  const parts = id.split('.');
  if (parts.length < 3) {
    return false;
  }
  // All parts must be uppercase with optional underscores
  return parts.every((part) => /^[A-Z][A-Z_]*$/.test(part));
}

function validateBehaviorIdFormat(id: string): void {
  if (!validateBehaviorId(id)) {
    addError({
      type: 'format',
      file: 'behaviors.json',
      id,
      message: `Invalid behavior ID format. Must be DOMAIN.ENTITY.OPERATION[.QUALIFIER]* (all uppercase)`,
    });
  }
}

function validateBehaviorIdConsistency(
  id: string,
  behavior: BehaviorRegistry['behaviors'][string]
): void {
  if (behavior.id !== id) {
    addError({
      type: 'format',
      file: 'behaviors.json',
      id,
      message: `Behavior ID mismatch: key is "${id}" but behavior.id is "${behavior.id}"`,
    });
  }
}

function validateBehaviorStatus(id: string, status: string): void {
  if (!VALID_STATUSES.includes(status)) {
    addError({
      type: 'format',
      file: 'behaviors.json',
      id,
      message: `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }
}

function validateBehaviorPriority(id: string, priority: string): void {
  if (!VALID_PRIORITIES.includes(priority)) {
    addError({
      type: 'format',
      file: 'behaviors.json',
      id,
      message: `Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`,
    });
  }
}

function validateBehaviorDependencies(
  id: string,
  dependencies: Array<string>,
  behaviorIds: Set<string>
): void {
  for (const depId of dependencies) {
    if (!behaviorIds.has(depId)) {
      addError({
        type: 'reference',
        file: 'behaviors.json',
        id,
        message: `Dependency "${depId}" does not exist`,
      });
    }
  }
}

function validateBehaviorIdParts(
  id: string,
  behavior: BehaviorRegistry['behaviors'][string]
): void {
  const expectedParts = [behavior.domain, behavior.entity, behavior.operation];
  const idParts = id.split('.');
  for (let i = 0; i < 3; i++) {
    if (idParts[i] !== expectedParts[i]) {
      addError({
        type: 'format',
        file: 'behaviors.json',
        id,
        message: `ID part mismatch: "${idParts[i]}" vs "${expectedParts[i]}"`,
      });
    }
  }
}

function validateRegistry(registry: BehaviorRegistry): void {
  const behaviorIds = new Set(Object.keys(registry.behaviors));

  for (const [id, behavior] of Object.entries(registry.behaviors)) {
    validateBehaviorIdFormat(id);
    validateBehaviorIdConsistency(id, behavior);
    validateBehaviorStatus(id, behavior.status);
    validateBehaviorPriority(id, behavior.priority);
    validateBehaviorDependencies(id, behavior.dependencies, behaviorIds);
    validateBehaviorIdParts(id, behavior);
  }
}

async function main(): Promise<void> {
  console.log('🔍 Validating behavior management system...\n');

  // Load and validate taxonomy.yaml
  console.log('📄 Loading taxonomy...');
  const taxonomy = await loadYaml<Taxonomy>(join(BEHAVIOR_DIR, 'taxonomy.yaml'));
  if (taxonomy) {
    console.log('✅ taxonomy.yaml loaded successfully\n');
  }

  // Load and validate behaviors.json
  console.log('📄 Loading behaviors registry...');
  const registry = await loadJson<BehaviorRegistry>('behaviors.json');

  if (!registry) {
    console.log('\n❌ Validation failed: behaviors.json not found or invalid\n');
    process.exit(1);
  }

  console.log('✅ behaviors.json loaded successfully\n');

  console.log('🔍 Validating behavior definitions...');
  validateRegistry(registry);

  // Report results
  if (errors.length === 0) {
    console.log('\n✅ All validations passed!\n');
    console.log(`   Total Behaviors: ${Object.keys(registry.behaviors).length}`);
    console.log(`   Registry Version: ${registry.version}`);
    console.log(`   Product: ${registry.product}\n`);
    process.exit(0);
  }

  console.log(`\n❌ Found ${errors.length} validation errors:\n`);

  const errorsByType = new Map<string, Array<ValidationError>>();
  for (const error of errors) {
    const key = error.type;
    if (!errorsByType.has(key)) {
      errorsByType.set(key, []);
    }
    errorsByType.get(key)?.push(error);
  }

  for (const [type, typeErrors] of errorsByType) {
    console.log(`  ${type.toUpperCase()} ERRORS (${typeErrors.length}):`);
    for (const error of typeErrors) {
      if (error.id) {
        console.log(`    [${error.id}] ${error.message}`);
      } else {
        console.log(`    ${error.message}`);
      }
    }
    console.log();
  }

  process.exit(1);
}

main().catch((error) => {
  // biome-ignore lint/suspicious/noConsole: Error reporting requires console
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
