#!/usr/bin/env node
/**
 * @feature INBOX.CONTRACT.FIX
 * Safe self-healing fixes for inbox funnel frontmatter (never edits title/summary/tags content).
 *
 * Usage:
 *   node scripts/inbox-fix.mjs [--dry-run|--apply] [--from-report] [--inbox-dir <path>]
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import {
  INBOX_DIR,
  loadContract,
  listInboxFilesSync,
  parseInboxFile,
  inferTypeFromFilename,
  isIsoTimestamp,
} from './lib/inbox-contract.mjs';
import { loadLatestReport } from './lib/inbox-report.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || !args.includes('--apply');
const FROM_REPORT = args.includes('--from-report');
const inboxIdx = args.indexOf('--inbox-dir');
const inboxDir = inboxIdx !== -1 ? args[inboxIdx + 1] : INBOX_DIR;

const AUTOMATABLE_CODES = new Set([
  'INBOX.FM.MISSING_TIMESTAMP',
  'INBOX.FM.MISSING_AGENT',
  'INBOX.FM.MISSING_TYPE',
  'INBOX.FM.INVALID_TYPE',
  'INBOX.FM.INVALID_SEVERITY',
  'INBOX.FM.INVALID_TIMESTAMP',
]);

function mtimeIso(filePath) {
  const mtime = statSync(filePath).mtime;
  return mtime.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function applyFixesToFile(filePath, filename, targetCodes = null) {
  const contract = loadContract();
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = { ...(parsed.data ?? {}) };
  const applied = [];

  const needs = (code) => !targetCodes || targetCodes.has(code);

  if (needs('INBOX.FM.MISSING_TIMESTAMP') && !data.timestamp) {
    data.timestamp = mtimeIso(filePath);
    applied.push('INBOX.FM.MISSING_TIMESTAMP');
  }
  if (needs('INBOX.FM.INVALID_TIMESTAMP') && data.timestamp && !isIsoTimestamp(String(data.timestamp))) {
    data.timestamp = mtimeIso(filePath);
    applied.push('INBOX.FM.INVALID_TIMESTAMP');
  }
  if (needs('INBOX.FM.MISSING_AGENT') && !data.agent) {
    data.agent = 'unknown';
    applied.push('INBOX.FM.MISSING_AGENT');
  }
  if (needs('INBOX.FM.MISSING_TYPE') && !data.type) {
    data.type = inferTypeFromFilename(filename);
    applied.push('INBOX.FM.MISSING_TYPE');
  }
  if (needs('INBOX.FM.INVALID_TYPE') && data.type && !contract.enums.entryType.includes(data.type)) {
    data.type = inferTypeFromFilename(filename);
    applied.push('INBOX.FM.INVALID_TYPE');
  }
  if (needs('INBOX.FM.INVALID_SEVERITY') && data.severity && !contract.enums.severity.includes(data.severity)) {
    data.severity = 'medium';
    applied.push('INBOX.FM.INVALID_SEVERITY');
  }

  if (applied.length === 0) return { applied: [], changed: false };

  const output = matter.stringify(parsed.content, data);
  if (!DRY_RUN) {
    writeFileSync(filePath, output, 'utf8');
  }

  return { applied, changed: true };
}

function codesFromReport() {
  const report = loadLatestReport();
  if (!report?.findings?.length) return null;
  const codes = new Set();
  for (const f of report.findings) {
    if (f.automatable && AUTOMATABLE_CODES.has(f.code)) {
      codes.add(f.code);
    }
  }
  return codes.size ? codes : null;
}

async function main() {
  const targetCodes = FROM_REPORT ? codesFromReport() : null;
  if (FROM_REPORT && !targetCodes) {
    console.log('inbox-fix: no automatable findings in latest report');
    process.exit(0);
  }

  let fixed = 0;
  let skipped = 0;

  for (const filename of listInboxFilesSync(inboxDir)) {
    if (!filename.endsWith('.md')) {
      skipped++;
      continue;
    }
    const filePath = join(inboxDir, filename);
    const { applied, changed } = applyFixesToFile(filePath, filename, targetCodes);
    if (changed) {
      fixed++;
      const mode = DRY_RUN ? 'DRY-RUN' : 'APPLIED';
      console.log(`  [${mode}] ${filename}: ${applied.join(', ')}`);
    } else {
      skipped++;
    }
  }

  console.log(`\ninbox-fix: ${fixed} fixed, ${skipped} skipped (${DRY_RUN ? 'dry-run' : 'apply'})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
