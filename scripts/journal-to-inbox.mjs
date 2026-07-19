#!/usr/bin/env node
/**
 * Promote private-journal entries into inbox funnel (contract v1).
 * Does not dual-write embeddings — run yarn intake after promotion.
 *
 * Usage:
 *   node scripts/journal-to-inbox.mjs [--source <journal-dir>] [--dry-run] [--limit N]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { INBOX_DIR, REPO_ROOT } from './lib/inbox-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_SOURCE = join(REPO_ROOT, 'agent/private-journal-mcp/.private-journal');

const SECTION_TYPE_MAP = {
  feelings: 'research',
  project_notes: 'solution',
  user_context: 'research',
  technical_insights: 'architecture',
  world_knowledge: 'research',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceIdx = args.indexOf('--source');
const limitIdx = args.indexOf('--limit');
const sourceDir = sourceIdx !== -1 ? resolve(args[sourceIdx + 1]) : DEFAULT_SOURCE;
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;

function walkJournalMd(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJournalMd(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

function inferSectionFromContent(body) {
  const lower = body.toLowerCase();
  for (const section of Object.keys(SECTION_TYPE_MAP)) {
    if (lower.includes(section.replace('_', ' '))) return section;
  }
  return 'technical_insights';
}

function toIsoFromJournalPath(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const dayFolder = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
  const fileBase = basename(filePath, '.md');
  if (dayFolder && /^\d{2}-\d{2}-\d{2}-\d+$/.test(fileBase)) {
    const [hh, mm, ss] = fileBase.split('-').slice(0, 3);
    return `${dayFolder}T${hh}:${mm}:${ss}Z`;
  }
  const mtime = statSync(filePath).mtime;
  return mtime.toISOString();
}

function slugify(text, max = 40) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max) || 'journal-memento';
}

function buildInboxFilename(timestamp, type, slug) {
  const ts = timestamp.replace(/[:.]/g, '-').replace('Z', '');
  return `${ts}_${type}_researcher_${slug}.md`;
}

function promoteEntry(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const body = (parsed.content || raw).trim();
  if (!body) return null;

  const section = parsed.data?.section ?? inferSectionFromContent(body);
  const type = SECTION_TYPE_MAP[section] ?? 'research';
  const timestamp = parsed.data?.timestamp
    ? new Date(parsed.data.timestamp).toISOString()
    : toIsoFromJournalPath(filePath);
  const slug = slugify(body.split('\n')[0] ?? 'journal');
  const filename = buildInboxFilename(timestamp, type, slug);

  const frontmatter = {
    timestamp,
    agent: 'journal-export',
    agent_role: 'researcher',
    type,
    severity: 'low',
    c4_container: 'agent-stack',
    tags: ['journal', section, 'journal-to-inbox'],
    title: body.split('\n')[0].slice(0, 120),
    summary: body.slice(0, 280),
  };

  const out = `---\n${Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(', ')}]`;
      return `${k}: ${v}`;
    })
    .join('\n')}\n---\n\n${body}\n`;

  return { filename, out, frontmatter };
}

function main() {
  const files = walkJournalMd(sourceDir).slice(0, limit);
  if (files.length === 0) {
    console.warn(`journal-to-inbox: no .md files under ${sourceDir}`);
    process.exit(0);
  }

  mkdirSync(INBOX_DIR, { recursive: true });
  let written = 0;

  for (const filePath of files) {
    const promoted = promoteEntry(filePath);
    if (!promoted) continue;

    const dest = join(INBOX_DIR, promoted.filename);
    if (existsSync(dest)) {
      console.log(`skip (exists): ${promoted.filename}`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] would write ${promoted.filename}`);
    } else {
      writeFileSync(dest, promoted.out, 'utf8');
      console.log(`wrote ${promoted.filename}`);
    }
    written += 1;
  }

  console.log(
    `journal-to-inbox: ${written} promoted (${dryRun ? 'dry-run' : 'applied'}) → ${INBOX_DIR}`
  );
  if (!dryRun && written > 0) {
    console.log('Next: yarn inbox:audit --lens funnel');
  }
}

main();
