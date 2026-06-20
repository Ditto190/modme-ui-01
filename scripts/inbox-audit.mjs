#!/usr/bin/env node
/**
 * @feature INBOX.CONTRACT.AUDIT
 * Audit inbox funnel files, pipeline DB rows, and manifest drift.
 *
 * Usage:
 *   node scripts/inbox-audit.mjs [--lens funnel|pipeline|manifest|all] [--strict] [--inbox-dir <path>]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  INBOX_DIR,
  loadContract,
  listInboxFilesSync,
  parseInboxFile,
  validateFunnelFile,
  validateEntryRecord,
  validateIndexManifest,
} from './lib/inbox-contract.mjs';
import { summarizeFindings, exitCodeFromSummary } from './lib/inbox-diagnostics.mjs';
import { writeInboxReport } from './lib/inbox-report.mjs';

const args = process.argv.slice(2);
const lensIdx = args.indexOf('--lens');
const LENS = lensIdx !== -1 ? args[lensIdx + 1] : 'all';
const STRICT = args.includes('--strict');
const inboxIdx = args.indexOf('--inbox-dir');
const inboxDir = inboxIdx !== -1 ? args[inboxIdx + 1] : INBOX_DIR;

async function auditFunnel(contract) {
  const findings = [];
  const files = listInboxFilesSync(inboxDir);

  for (const filename of files) {
    const filePath = join(inboxDir, filename);
    const parsed = parseInboxFile(filePath, filename);
    const fileFindings = validateFunnelFile(parsed, contract);
    findings.push(...fileFindings);
  }

  return { findings, filesScanned: files.length };
}

async function auditPipeline(contract) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('inbox-audit: skipping pipeline lens (missing Supabase env)');
    return { findings: [], filesScanned: 0 };
  }

  const supabase = createClient(url, key);
  const findings = [];

  const { data: rows, error } = await supabase
    .from('inbox_entries')
    .select('id, content_hash, source_file, source_format, status, category_id, embedding')
    .limit(500);

  if (error) {
    findings.push({
      code: 'INBOX.DB.QUERY_FAILED',
      lens: 'pipeline',
      severity: 'error',
      automatable: false,
      message: error.message,
    });
    return { findings, filesScanned: 0 };
  }

  const hashCounts = {};
  for (const row of rows ?? []) {
    hashCounts[row.content_hash] = (hashCounts[row.content_hash] ?? 0) + 1;
    findings.push(
      ...validateEntryRecord(row, contract).map((f) => ({
        ...f,
        file: row.source_file,
      }))
    );
  }

  for (const [hash, count] of Object.entries(hashCounts)) {
    if (count > 1) {
      findings.push({
        code: 'INBOX.DB.DUPLICATE_HASH',
        lens: 'pipeline',
        severity: 'error',
        automatable: false,
        message: `Duplicate content_hash (${count}x): ${hash.slice(0, 12)}...`,
      });
    }
  }

  return { findings, filesScanned: rows?.length ?? 0 };
}

async function auditManifest() {
  const manifestPath = join(inboxDir, '_index.json');
  if (!existsSync(manifestPath)) {
    return {
      findings: [{
        code: 'INBOX.MANIFEST.MISSING',
        lens: 'manifest',
        severity: 'warning',
        automatable: false,
        message: '_index.json not found',
      }],
      filesScanned: 0,
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let dbCount = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const { count } = await supabase
      .from('inbox_entries')
      .select('*', { count: 'exact', head: true });
    dbCount = count;
  }

  const contract = loadContract();
  const findings = validateIndexManifest(manifest, dbCount).map((f) => ({
    ...f,
    lens: 'manifest',
  }));

  return { findings, filesScanned: 1 };
}

async function main() {
  const contract = loadContract();
  let allFindings = [];
  let filesScanned = 0;

  const runFunnel = LENS === 'funnel' || LENS === 'all';
  const runPipeline = LENS === 'pipeline' || LENS === 'all';
  const runManifest = LENS === 'manifest' || LENS === 'all';

  if (runFunnel) {
    const r = await auditFunnel(contract);
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }
  if (runPipeline) {
    const r = await auditPipeline(contract);
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }
  if (runManifest) {
    const r = await auditManifest();
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }

  const summary = summarizeFindings(allFindings, { strict: STRICT });

  writeInboxReport({
    source: 'inbox-audit',
    lens: LENS,
    strict: STRICT,
    summary: { ...summary, files: filesScanned },
    findings: summary.findings,
  });

  console.log(
    `inbox-audit [${LENS}]: ${summary.errors} errors, ${summary.warnings} warnings (${summary.passed ? 'PASS' : 'FAIL'})`
  );
  console.log(`Report: docs/inbox-pipeline/reports/latest.md`);

  process.exit(exitCodeFromSummary(summary));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
