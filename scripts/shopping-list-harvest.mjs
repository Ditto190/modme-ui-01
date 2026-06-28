#!/usr/bin/env node
/**
 * @feature INBOX.SCRAPE.HARVEST
 * Harvest URLs from shopping-list.md → scrape-job YAML + annotations sidecar.
 *
 * Architecture (ADR-0009 / docs/inbox-pipeline/README.md dual-store):
 *   shopping-list → scrape-job.schema.json → Firecrawl extract → scrape_pages → funnel .md
 *   No new primary contract — annotations live in sidecar JSON keyed by normalized URL.
 *
 * Usage:
 *   node scripts/shopping-list-harvest.mjs [--section=lean-ctx|gascity|all] [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  parseShoppingListLines,
  filterBySection,
  buildCollectionYaml,
  buildAnnotationsSidecar,
} from './lib/shopping-list-parse.mjs';
import { validateWithSchema } from './yaml-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SHOPPING_LIST = join(ROOT, 'GenerativeUI_monorepo/docs/inbox/shopping-list.md');
const JOBS_DIR = join(ROOT, 'GenerativeUI_monorepo/scrape-pipeline/scrape-jobs');
const SCHEMA_PATH = join(JOBS_DIR, 'scrape-job.schema.json');
const SECTION_START = 285; // 0-indexed line 286
const SECTION_END = 367; // inclusive line 368

const args = process.argv.slice(2);
const sectionArg = args.find((a) => a.startsWith('--section='));
const SECTION = sectionArg ? sectionArg.split('=')[1] : 'lean-ctx';
const DRY_RUN = args.includes('--dry-run');

function slugForSection(section) {
  if (section === 'gascity') return 'gascity-fleet-shopping-list';
  if (section === 'all') return 'lean-ctx-shopping-list';
  return 'lean-ctx-shopping-list';
}

async function main() {
  const content = readFileSync(SHOPPING_LIST, 'utf8');
  const lines = content.split(/\r?\n/).slice(SECTION_START, SECTION_END + 1);
  const { entries } = parseShoppingListLines(lines);
  const filtered = filterBySection(entries, SECTION);

  if (!filtered.length) {
    console.error(`No URLs found for section=${SECTION}`);
    process.exit(1);
  }

  const slug = slugForSection(SECTION);
  const seeds = filtered.map((e) => e.url);
  const collection = buildCollectionYaml(
    slug,
    SECTION === 'gascity'
      ? 'GAS CITY FLEET shopping list'
      : 'Lean-ctx shopping list (Firecrawl intake)',
    seeds
  );

  const validation = await validateWithSchema(collection, SCHEMA_PATH);
  if (!validation.valid) {
    console.error('Schema validation failed:', JSON.stringify(validation.errors, null, 2));
    process.exit(3);
  }

  const yamlPath = join(JOBS_DIR, `${slug}.collection.yml`);
  const sidecarPath = join(JOBS_DIR, `${slug}.annotations.json`);
  const sidecar = buildAnnotationsSidecar(filtered);

  console.log(`Harvest: ${filtered.length} unique URL(s) → ${slug}`);
  console.log(`  YAML: ${yamlPath}`);
  console.log(`  Sidecar: ${sidecarPath}`);

  if (DRY_RUN) {
    console.log(JSON.stringify({ collection, sidecar }, null, 2));
    return;
  }

  mkdirSync(JOBS_DIR, { recursive: true });
  writeFileSync(yamlPath, yaml.dump(collection, { lineWidth: 120, noRefs: true }), 'utf8');
  writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
