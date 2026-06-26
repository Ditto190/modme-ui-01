#!/usr/bin/env node
/**
 * @feature SKILLS.INDEX.GENERATE
 * Emit skills_index.json + data/ mirror from .agents/skills (recursive SKILL.md walk)
 *
 * Usage:
 *   node scripts/skills-index-generate.mjs [--dry-run] [--no-validate]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import Ajv from 'ajv';
import { inferCategorySlug } from './lib/category-scorer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(ROOT, '.agents', 'skills');
const SCHEMA_PATH = path.join(
  ROOT,
  'docs/inbox-pipeline/contracts/skills-index.v1.schema.json'
);
const OUT_CANONICAL = path.join(ROOT, 'skills_index.json');
const OUT_MIRROR = path.join(ROOT, 'data', 'skills_index.json');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_VALIDATE = process.argv.includes('--no-validate');

function walkSkillFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '.disabled') continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSkillFiles(full, results);
      continue;
    }
    if (entry.isFile() && entry.name === 'SKILL.md') {
      results.push(full);
    }
  }
  return results;
}

function relativeSkillPath(skillFile) {
  const skillDir = path.dirname(skillFile);
  return path.relative(SKILLS_ROOT, skillDir).replace(/\\/g, '/');
}

function skillIdFromPath(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function parseSkillEntry(skillFile) {
  const raw = fs.readFileSync(skillFile, 'utf8');
  const { data: fm, content } = matter(raw);
  const relativePath = relativeSkillPath(skillFile);
  const id = skillIdFromPath(relativePath);
  const stat = fs.statSync(skillFile);

  const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name.trim() : id;
  const description =
    typeof fm.description === 'string' && fm.description.trim()
      ? fm.description.trim()
      : content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? '';

  const category =
    typeof fm.category === 'string' && fm.category.trim()
      ? fm.category.trim()
      : inferCategorySlug(`${name} ${description} ${content.slice(0, 2000)}`);

  const risk = typeof fm.risk === 'string' && fm.risk.trim() ? fm.risk.trim() : 'low';
  const source =
    typeof fm.source === 'string' && fm.source.trim() ? fm.source.trim() : 'project';

  const dateAdded =
    typeof fm.date_added === 'string'
      ? fm.date_added
      : stat.mtime.toISOString().slice(0, 10);

  const tags = Array.isArray(fm.tags)
    ? fm.tags.filter((t) => typeof t === 'string')
    : undefined;

  const entry = {
    id,
    path: id,
    category,
    name,
    description,
    risk,
    source,
    date_added: dateAdded,
  };

  if (tags?.length) entry.tags = tags;
  return entry;
}

function validateIndex(entries) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(entries);
  if (!ok) {
    console.error('[skills-index] Schema validation failed:');
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath || '/'} ${err.message}`);
    }
    process.exit(1);
  }
}

function main() {
  const skillFiles = walkSkillFiles(SKILLS_ROOT);
  if (!skillFiles.length) {
    console.warn('[skills-index] No SKILL.md files under .agents/skills/');
  }

  const entries = skillFiles
    .map(parseSkillEntry)
    .sort((a, b) => a.id.localeCompare(b.id));

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      console.error(`[skills-index] Duplicate skill id: ${entry.id}`);
      process.exit(1);
    }
    seen.add(entry.id);
  }

  if (!SKIP_VALIDATE) validateIndex(entries);

  const json = `${JSON.stringify(entries, null, 2)}\n`;

  if (DRY_RUN) {
    console.log(`[skills-index] dry-run — would write ${entries.length} entries`);
    console.log(json.slice(0, 500));
    return;
  }

  fs.mkdirSync(path.dirname(OUT_MIRROR), { recursive: true });
  fs.writeFileSync(OUT_CANONICAL, json, 'utf8');
  fs.writeFileSync(OUT_MIRROR, json, 'utf8');

  console.log(
    `[skills-index] Wrote ${entries.length} entries → skills_index.json + data/skills_index.json`
  );
}

main();
