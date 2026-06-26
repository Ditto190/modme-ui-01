#!/usr/bin/env node
/**
 * Emit skills_index.json + data/skills_index.json from .agents/skills (recursive SKILL.md walk)
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
const SCHEMA_PATH = path.join(ROOT, 'docs/inbox-pipeline/contracts/skills-index.v1.schema.json');
const OUT_CANONICAL = path.join(ROOT, 'skills_index.json');
const OUT_MIRROR = path.join(ROOT, 'data', 'skills_index.json');

function walkSkillFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '.disabled') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSkillFiles(full, results);
    else if (entry.name === 'SKILL.md') results.push(full);
  }
  return results;
}

function parseSkillEntry(skillFile) {
  const raw = fs.readFileSync(skillFile, 'utf8');
  const { data: fm, content } = matter(raw);
  const id = path.relative(SKILLS_ROOT, path.dirname(skillFile)).replace(/\\/g, '/');
  const stat = fs.statSync(skillFile);
  const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name.trim() : id;
  const description =
    typeof fm.description === 'string' && fm.description.trim()
      ? fm.description.trim()
      : content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? '';
  return {
    id,
    path: id,
    category: fm.category?.trim() || inferCategorySlug(`${name} ${description}`),
    name,
    description,
    risk: fm.risk?.trim() || 'low',
    source: fm.source?.trim() || 'project',
    date_added: fm.date_added || stat.mtime.toISOString().slice(0, 10),
    ...(Array.isArray(fm.tags) ? { tags: fm.tags.filter((t) => typeof t === 'string') } : {}),
  };
}

function validateIndex(entries) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(entries)) {
    console.error('[skills-index] Schema validation failed');
    process.exit(1);
  }
}

const entries = walkSkillFiles(SKILLS_ROOT).map(parseSkillEntry).sort((a, b) => a.id.localeCompare(b.id));
validateIndex(entries);
const json = `${JSON.stringify(entries, null, 2)}\n`;
fs.mkdirSync(path.dirname(OUT_MIRROR), { recursive: true });
fs.writeFileSync(OUT_CANONICAL, json, 'utf8');
fs.writeFileSync(OUT_MIRROR, json, 'utf8');
console.log(`[skills-index] Wrote ${entries.length} entries`);
