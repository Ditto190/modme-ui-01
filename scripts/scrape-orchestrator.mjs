#!/usr/bin/env node
/**
 * @feature INBOX.SCRAPE.ORCHESTRATE
 * Thin wrapper: manifest validation → scrape run → classify → promote.
 *
 * Usage:
 *   node scripts/scrape-orchestrator.mjs --manifest=docs-sitemap [--engine=firecrawl|scrapy] [--dry-run]
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { checkHealth, getFirecrawlBaseUrl } from './lib/firecrawl-local-client.mjs';
import { parseCollectionYaml, validateWithSchema } from './yaml-parser.mjs';
import { appendValidationError } from './lib/intake-validation-report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const manifestArg = args.find((a) => a.startsWith('--manifest='));
const MANIFEST = manifestArg ? manifestArg.split('=')[1] : 'docs-sitemap';
const DRY_RUN = args.includes('--dry-run');
const engineArg = args.find((a) => a.startsWith('--engine='));
const ENGINE = engineArg ? engineArg.split('=')[1] : 'scrapy';

const MANIFEST_YAML = join(
  ROOT,
  'GenerativeUI_monorepo/scrape-pipeline/scrape-jobs',
  `${MANIFEST}.collection.yml`
);
const MANIFEST_SCHEMA = join(
  ROOT,
  'GenerativeUI_monorepo/scrape-pipeline/scrape-jobs/scrape-job.schema.json'
);

function runNode(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [resolve(ROOT, script), ...scriptArgs], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

function runPythonCrawl() {
  const ps1 = resolve(ROOT, 'scripts/run-scrape-pipeline.ps1');
  const psArgs = ['-ExecutionPolicy', 'Bypass', '-File', ps1, '-Manifest', MANIFEST];
  if (DRY_RUN) psArgs.push('-DryRun');

  const result = spawnSync('powershell', psArgs, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

function runFirecrawlStage() {
  const scriptArgs = [`--manifest=${MANIFEST}`, ...(DRY_RUN ? ['--dry-run'] : ['--local-only'])];
  return runNode('scripts/firecrawl-scrape-stage.mjs', scriptArgs);
}

function runScrapeEngine() {
  if (ENGINE === 'firecrawl') {
    return runFirecrawlStage();
  }
  return runPythonCrawl();
}

function runStep(label, fn) {
  console.log(`\n== ${label} ==`);
  const code = fn();
  if (code !== 0) {
    console.error(`scrape-orchestrator: ${label} failed (exit ${code})`);
    process.exit(code);
  }
}

async function firecrawlPreflight() {
  if (ENGINE !== 'firecrawl' || DRY_RUN) return;

  const baseUrl = getFirecrawlBaseUrl();
  console.log(`\n== Firecrawl API pre-flight (${baseUrl}) ==`);
  const health = await checkHealth(baseUrl);
  if (!health.ok) {
    console.error(`Firecrawl API unreachable at ${baseUrl}`);
    if (health.error) console.error(`  ${health.error}`);
    console.error('  Setup: yarn firecrawl:setup && yarn firecrawl:up');
    console.error('  Status: yarn firecrawl:status');
    process.exit(2);
  }
  console.log(`Firecrawl API reachable (HTTP ${health.status ?? 'ok'}).`);
}

async function validateManifestPreflight() {
  console.log('\n== Manifest schema pre-flight ==');
  const collection = await parseCollectionYaml(MANIFEST_YAML);
  if (!collection) {
    const msg = `Failed to parse manifest YAML: ${MANIFEST_YAML}`;
    appendValidationError({ stage: 'manifest', path: MANIFEST_YAML, issues: [msg] });
    console.error(msg);
    process.exit(2);
  }

  const validation = await validateWithSchema(collection, MANIFEST_SCHEMA);
  if (!validation.valid) {
    const issues = (validation.errors || []).map((e) =>
      typeof e === 'string' ? e : JSON.stringify(e)
    );
    appendValidationError({ stage: 'manifest', path: MANIFEST_YAML, issues });
    console.error('Manifest schema validation failed:', JSON.stringify(validation.errors, null, 2));
    process.exit(3);
  }
  console.log(`Manifest "${MANIFEST}" passed schema validation.`);
}

async function main() {
  loadRootEnv({ fileWins: true });
  await validateManifestPreflight();
  await firecrawlPreflight();

  runStep(ENGINE === 'firecrawl' ? 'Firecrawl scrape' : 'Scrapy crawl', () => runScrapeEngine());

  const classifyArgs = [
    ...(DRY_RUN ? ['--dry-run'] : []),
    ...(ENGINE === 'firecrawl' ? [`--manifest=${MANIFEST}`, '--local-only'] : []),
  ];
  runStep('Ollama classify', () => runNode('scripts/scrape-classify.mjs', classifyArgs));

  const promoteArgs = [
    ...(DRY_RUN ? ['--dry-run'] : []),
    ...(ENGINE === 'firecrawl' ? [`--manifest=${MANIFEST}`, '--local-only', '--export-md'] : []),
  ];
  runStep('Promote to inbox', () => runNode('scripts/scrape-promote.mjs', promoteArgs));

  console.log('\nscrape-orchestrator: complete');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

