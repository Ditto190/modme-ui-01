#!/usr/bin/env tsx

/**
 * Behavior Sync Script
 *
 * Scans test files for @behavior headers and generates behaviors.json registry.
 * Computes behavior status from vitest results (test-results/results.json).
 *
 * Key Concepts:
 * - behaviors.json = Complete registry of ALL behaviors
 * - Status computed from tests: all passing → DONE, some failing → IN_PROGRESS, none passing → PLANNED
 * - Test files are source of truth: @behavior headers in *.test.ts files drive the registry
 * - NO @status field in headers (computed automatically)
 */

import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

interface VitestResults {
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed';
    assertionResults: Array<{
      ancestorTitles: Array<string>;
      fullName: string;
      status: 'passed' | 'failed';
      title: string;
    }>;
  }>;
}

interface BehaviorHeader {
  id: string;
  domain: string;
  entity: string;
  operation: string;
  qualifiers: Array<string>;

  // Metadata
  status?: string;
  priority?: string;
  effort?: string;

  // Context
  theme?: string;
  persona?: string;

  // Value Classification (from AVF)
  valueDomain?: string;
  valueType?: string;

  // Why/Who/What
  why?: string;
  success?: string;
  impact?: string;
  who?: string;
  what?: string;

  // Acceptance criteria (checkbox list)
  acceptance: Array<string>;

  // Technical
  layer?: string;
  dependencies: Array<string>;

  // File location
  filePath: string;
  lineNumber: number;
}

interface BehaviorRegistry {
  version: string;
  generated: string;
  product: string;

  // All behaviors
  behaviors: Record<
    string,
    {
      id: string;
      domain: string;
      entity: string;
      operation: string;
      qualifiers: Array<string>;
      status: string;
      priority: string;
      effort?: string;
      theme?: string;
      persona?: string;
      valueDomain?: string;
      valueType?: string;
      why?: string;
      success?: string;
      impact?: string;
      who?: string;
      what?: string;
      acceptanceCriteria: Array<{ text: string; checked: boolean }>;
      layers: Array<string>;
      dependencies: Array<string>;
      files: Array<string>;
      lastUpdated: string;
    }
  >;

  // Views into the registry
  views: {
    byStatus: Record<string, Array<string>>;
    byPersona: Record<string, Array<string>>;
    byTheme: Record<string, Array<string>>;
    byPriority: Record<string, Array<string>>;
    byDomain: Record<string, Array<string>>;
  };

  // Stats
  stats: {
    total: number;
    done: number;
    inProgress: number;
    planned: number;
    blocked: number;
    deprecated: number;
    completionPercentage: number;
  };
}

const WORKSPACE_ROOT = process.cwd();
const SCAN_DIRS = ['apps', 'packages'];
const IGNORE_DIRS = ['node_modules', 'dist', '.turbo', 'coverage', 'test-results'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Recursively scan directory for TypeScript/JavaScript files
 */
async function* scanFiles(dir: string): AsyncGenerator<string> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) {
          yield* scanFiles(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.'));
        if (FILE_EXTENSIONS.includes(ext)) {
          yield fullPath;
        }
      }
    }
  } catch (_error) {
    // Skip directories we can't read
    return;
  }
}

/**
 * Parse @behavior header from file content
 */
type SectionType = 'why' | 'success' | 'impact' | 'who' | 'what' | 'acceptance' | null;

interface ParseContext {
  currentSection: SectionType;
  sectionContent: Array<string>;
}

function createBehaviorHeader(
  behaviorId: string,
  filePath: string,
  lineNumber: number
): BehaviorHeader {
  const parts = behaviorId.split('.');
  return {
    id: behaviorId,
    domain: parts[0] || '',
    entity: parts[1] || '',
    operation: parts[2] || '',
    qualifiers: parts.slice(3),
    dependencies: [],
    acceptance: [],
    filePath,
    lineNumber,
  };
}

function parseSimpleField(metaLine: string, pattern: RegExp): string | undefined {
  const match = metaLine.match(pattern);
  return match ? match[1] : undefined;
}

function parseMetadataFields(metaLine: string, header: BehaviorHeader): void {
  const status = parseSimpleField(metaLine, /@status\s+(\w+)/);
  if (status) {
    header.status = status;
  }

  const priority = parseSimpleField(metaLine, /@priority\s+(\w+)/);
  if (priority) {
    header.priority = priority;
  }

  const effort = parseSimpleField(metaLine, /@effort\s+(\w+)/);
  if (effort) {
    header.effort = effort;
  }

  const theme = parseSimpleField(metaLine, /@theme\s+(\w+)/);
  if (theme) {
    header.theme = theme;
  }

  const persona = parseSimpleField(metaLine, /@persona\s+([A-Z.]+)/);
  if (persona) {
    header.persona = persona;
  }

  const layer = parseSimpleField(metaLine, /@layer\s+(\w+)/);
  if (layer) {
    header.layer = layer;
  }

  const valueDomain = parseSimpleField(metaLine, /@valueDomain\s+(\w+)/);
  if (valueDomain) {
    header.valueDomain = valueDomain;
  }

  const valueType = parseSimpleField(metaLine, /@valueType\s+(\w+)/);
  if (valueType) {
    header.valueType = valueType;
  }

  const depsMatch = metaLine.match(/@dependencies\s+\[(.*?)\]/);
  if (depsMatch) {
    header.dependencies = depsMatch[1]
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
  }
}

function finalizeSectionContent(header: BehaviorHeader, context: ParseContext): void {
  if (
    context.currentSection &&
    context.currentSection !== 'acceptance' &&
    context.sectionContent.length > 0
  ) {
    header[context.currentSection] = context.sectionContent.join('\n').trim();
  }
}

function handleSectionTransition(
  metaLine: string,
  header: BehaviorHeader,
  context: ParseContext
): boolean {
  const sectionMarkers: Array<{ marker: string; section: SectionType }> = [
    { marker: '@why', section: 'why' },
    { marker: '@success', section: 'success' },
    { marker: '@impact', section: 'impact' },
    { marker: '@who', section: 'who' },
    { marker: '@what', section: 'what' },
    { marker: '@acceptance', section: 'acceptance' },
  ];

  for (const { marker, section } of sectionMarkers) {
    if (metaLine.includes(marker)) {
      finalizeSectionContent(header, context);
      context.currentSection = section;
      context.sectionContent = [];

      // Capture content on the same line as the marker
      const sameLineContent = metaLine.split(marker)[1];
      if (sameLineContent) {
        const trimmed = sameLineContent
          .replace(/^\s*/, '')
          .replace(/\s*\*\/\s*$/, '')
          .trim();
        if (trimmed) {
          context.sectionContent.push(trimmed);
        }
      }

      return true;
    }
  }

  return false;
}

function parseSectionContent(
  metaLine: string,
  header: BehaviorHeader,
  context: ParseContext
): void {
  if (context.currentSection === 'acceptance') {
    const checkboxMatch = metaLine.match(/[*/]\s*-\s*\[([ x])\]\s*(.+)/);
    if (checkboxMatch) {
      header.acceptance.push(`[${checkboxMatch[1]}] ${checkboxMatch[2].trim()}`);
    }
  } else if (context.currentSection) {
    const contentMatch = metaLine.match(/[*/]\s*(.+)/);
    if (contentMatch && !contentMatch[1].startsWith('@')) {
      context.sectionContent.push(contentMatch[1].trim());
    }
  }
}

function isEndOfComment(metaLine: string): boolean {
  return metaLine.includes('*/') || (!metaLine.includes('*') && !metaLine.trim().startsWith('//'));
}

function parseBehaviorMetadata(
  lines: Array<string>,
  startIndex: number,
  header: BehaviorHeader
): void {
  const context: ParseContext = { currentSection: null, sectionContent: [] };
  let j = startIndex;

  while (j < lines.length && (lines[j].includes('*') || lines[j].trim().startsWith('//'))) {
    const metaLine = lines[j];

    parseMetadataFields(metaLine, header);

    const transitioned = handleSectionTransition(metaLine, header, context);
    if (transitioned) {
      j++;
      continue;
    }

    parseSectionContent(metaLine, header, context);

    if (isEndOfComment(metaLine)) {
      finalizeSectionContent(header, context);
      break;
    }

    j++;
  }
}

function parseBehaviorHeaders(content: string, filePath: string): Array<BehaviorHeader> {
  const headers: Array<BehaviorHeader> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const behaviorMatch = lines[i].match(/@behavior\s+([A-Z]+(?:\.[A-Z_]+)+)/);
    if (!behaviorMatch) {
      continue;
    }

    const header = createBehaviorHeader(behaviorMatch[1], filePath, i + 1);
    parseBehaviorMetadata(lines, i + 1, header);
    headers.push(header);
  }

  return headers;
}

function createBehaviorFromHeader(header: BehaviorHeader): BehaviorRegistry['behaviors'][string] {
  return {
    id: header.id,
    domain: header.domain,
    entity: header.entity,
    operation: header.operation,
    qualifiers: header.qualifiers,
    status: header.status || 'PLANNED',
    priority: header.priority || 'MEDIUM',
    effort: header.effort,
    theme: header.theme,
    persona: header.persona,
    valueDomain: header.valueDomain,
    valueType: header.valueType,
    why: header.why,
    success: header.success,
    impact: header.impact,
    who: header.who,
    what: header.what,
    acceptanceCriteria: header.acceptance.map((ac) => ({
      text: ac.replace(/^\[[ x]\]\s*/, ''),
      checked: ac.startsWith('[x]'),
    })),
    layers: [],
    dependencies: header.dependencies,
    files: [],
    lastUpdated: new Date().toISOString(),
  };
}

function mergeBehaviorData(
  behavior: BehaviorRegistry['behaviors'][string],
  header: BehaviorHeader
): void {
  // Add layer if specified
  if (header.layer && !behavior.layers.includes(header.layer)) {
    behavior.layers.push(header.layer);
  }

  // Add file path
  const relativePath = relative(WORKSPACE_ROOT, header.filePath);
  if (!behavior.files.includes(relativePath)) {
    behavior.files.push(relativePath);
  }

  // Merge dependencies (deduplicate)
  for (const dep of header.dependencies) {
    if (!behavior.dependencies.includes(dep)) {
      behavior.dependencies.push(dep);
    }
  }
}

function addToView(views: Record<string, Array<string>>, key: string, behaviorId: string): void {
  if (!views[key]) {
    views[key] = [];
  }
  views[key].push(behaviorId);
}

function buildViews(behaviors: BehaviorRegistry['behaviors']): BehaviorRegistry['views'] {
  const views: BehaviorRegistry['views'] = {
    byStatus: {},
    byPersona: {},
    byTheme: {},
    byPriority: {},
    byDomain: {},
  };

  for (const [behaviorId, behavior] of Object.entries(behaviors)) {
    addToView(views.byStatus, behavior.status, behaviorId);
    if (behavior.persona) {
      addToView(views.byPersona, behavior.persona, behaviorId);
    }
    if (behavior.theme) {
      addToView(views.byTheme, behavior.theme, behaviorId);
    }
    addToView(views.byPriority, behavior.priority, behaviorId);
    addToView(views.byDomain, behavior.domain, behaviorId);
  }

  return views;
}

function calculateStats(
  views: BehaviorRegistry['views'],
  total: number
): BehaviorRegistry['stats'] {
  const done = views.byStatus.DONE?.length || 0;
  const inProgress = views.byStatus.IN_PROGRESS?.length || 0;
  const planned = views.byStatus.PLANNED?.length || 0;
  const blocked = views.byStatus.BLOCKED?.length || 0;
  const deprecated = views.byStatus.DEPRECATED?.length || 0;

  return {
    total,
    done,
    inProgress,
    planned,
    blocked,
    deprecated,
    completionPercentage: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

/**
 * Load vitest results and compute behavior status
 * Status logic:
 * - DONE: All tests for this behavior passing
 * - IN_PROGRESS: Some tests passing, some failing
 * - PLANNED: All tests failing or no tests found
 */
async function loadTestResults(): Promise<Map<string, 'DONE' | 'IN_PROGRESS' | 'PLANNED'>> {
  const statusMap = new Map<string, 'DONE' | 'IN_PROGRESS' | 'PLANNED'>();
  const testResultsPath = join(process.cwd(), 'test-results', 'results.json');

  if (!existsSync(testResultsPath)) {
    console.log(
      '⚠️  No test results found (run `yarn test` first). All behaviors default to PLANNED.'
    );
    return statusMap;
  }

  try {
    const resultsContent = await readFile(testResultsPath, 'utf-8');
    const results: VitestResults = JSON.parse(resultsContent);

    // Map: behavior ID → { passing: number, failing: number }
    const behaviorTests = new Map<string, { passing: number; failing: number }>();

    for (const testFile of results.testResults) {
      for (const assertion of testFile.assertionResults) {
        // Behavior ID is the first ancestor title (describe block)
        const behaviorId = assertion.ancestorTitles[0];
        if (!behaviorId) continue;

        const counts = behaviorTests.get(behaviorId) || { passing: 0, failing: 0 };
        if (assertion.status === 'passed') {
          counts.passing++;
        } else {
          counts.failing++;
        }
        behaviorTests.set(behaviorId, counts);
      }
    }

    // Compute status for each behavior
    for (const [behaviorId, counts] of behaviorTests.entries()) {
      if (counts.failing === 0 && counts.passing > 0) {
        statusMap.set(behaviorId, 'DONE');
      } else if (counts.passing > 0 && counts.failing > 0) {
        statusMap.set(behaviorId, 'IN_PROGRESS');
      } else {
        statusMap.set(behaviorId, 'PLANNED');
      }
    }

    return statusMap;
  } catch (error) {
    console.error('⚠️  Error loading test results:', error);
    return statusMap;
  }
}

/**
 * Build behavior registry from parsed headers
 */
async function buildRegistry(
  headers: Array<BehaviorHeader>,
  testStatusMap: Map<string, 'DONE' | 'IN_PROGRESS' | 'PLANNED'>
): Promise<BehaviorRegistry> {
  const behaviors: BehaviorRegistry['behaviors'] = {};

  // Build behaviors from headers
  for (const header of headers) {
    if (!behaviors[header.id]) {
      behaviors[header.id] = createBehaviorFromHeader(header);
    }
    // Override status with computed value from tests
    const computedStatus = testStatusMap.get(header.id);
    if (computedStatus) {
      behaviors[header.id].status = computedStatus;
    }
    mergeBehaviorData(behaviors[header.id], header);
  }

  // Build views and stats
  const views = buildViews(behaviors);
  const stats = calculateStats(views, Object.keys(behaviors).length);

  return {
    version: '2.0.0',
    generated: new Date().toISOString(),
    product: 'ts-fullstack',
    behaviors,
    views,
    stats,
  };
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Scanning codebase for @behavior headers...\n');

  const allHeaders: Array<BehaviorHeader> = [];
  let fileCount = 0;

  for (const dir of SCAN_DIRS) {
    const scanPath = join(WORKSPACE_ROOT, dir);

    for await (const filePath of scanFiles(scanPath)) {
      fileCount++;
      const content = await readFile(filePath, 'utf-8');
      const headers = parseBehaviorHeaders(content, filePath);

      if (headers.length > 0) {
        const relativePath = relative(WORKSPACE_ROOT, filePath);
        console.log(
          `  ✓ ${relativePath} (${headers.length} behavior${headers.length === 1 ? '' : 's'})`
        );
        allHeaders.push(...headers);
      }
    }
  }

  console.log(`\n📊 Scanned ${fileCount} files, found ${allHeaders.length} behavior headers\n`);

  if (allHeaders.length === 0) {
    console.log('⚠️  No @behavior headers found. Add @behavior comments to your code.');
    console.log('   Example:');
    console.log('   /**');
    console.log('    * @behavior USER.ROUTE.CREATE');
    console.log('    * @status PLANNED');
    console.log('    * @priority HIGH');
    console.log('    * @persona DEVELOPER');
    console.log('    * ');
    console.log('    * @what');
    console.log('    * Given: User wants to create a user record');
    console.log('    * When: They call POST /api/users');
    console.log('    * Then: User is created and returned');
    console.log('    * ');
    console.log('    * @acceptance');
    console.log('    * - [ ] User record created in database');
    console.log('    * - [ ] User data validated');
    console.log('    */');
    process.exit(0);
  }

  // Load test results and compute status from vitest
  console.log('\n🧪 Computing behavior status from test results...\n');
  const testStatusMap = await loadTestResults();

  // Build registry
  const registry = await buildRegistry(allHeaders, testStatusMap);

  // Write behaviors.json
  const registryPath = join(WORKSPACE_ROOT, 'behaviors.json');
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  console.log('✅ Generated behaviors.json (Behavior Registry)\n');
  console.log(`   Total Behaviors: ${registry.stats.total}`);
  console.log(`   ✓ Done: ${registry.stats.done}`);
  console.log(`   ⚙ In Progress: ${registry.stats.inProgress}`);
  console.log(`   ○ Planned (Backlog): ${registry.stats.planned}`);
  console.log(`   ⊗ Blocked: ${registry.stats.blocked}`);
  console.log(`   ✗ Deprecated: ${registry.stats.deprecated}`);
  console.log(`   Completion: ${registry.stats.completionPercentage}%\n`);
  console.log(`   Domains: ${Object.keys(registry.views.byDomain).length}`);
  console.log(`   Personas: ${Object.keys(registry.views.byPersona).length}`);
  console.log(`   Themes: ${Object.keys(registry.views.byTheme).length}`);
  console.log('');
}

main().catch((_error: unknown) => {
  process.exit(1);
});
