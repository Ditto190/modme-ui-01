/**
 * Beads CLI hooks for intake pipeline stages (modme prefix).
 */
import { spawnSync } from 'node:child_process';

function runBd(args) {
  const result = spawnSync('npx', ['--yes', '@beads/bd', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
  };
}

/** @param {string} slug */
export function beadsCreateScrapeIssue(slug) {
  return runBd(['create', `scrape:${slug}`, '--json']);
}

/** @param {string} issueId */
export function beadsMarkBlocked(issueId, reason) {
  return runBd(['update', issueId, '--status', 'blocked', '--notes', reason.slice(0, 500)]);
}

/** @param {string} issueId */
export function beadsMarkDone(issueId) {
  return runBd(['update', issueId, '--status', 'done']);
}

/** @param {string} path */
export function beadsCreateSchemaDriftIssue(path) {
  return runBd(['create', `schema-drift:${path}`, '--priority', '1', '--json']);
}

/** Best-effort — never throws */
export function beadsTry(fn) {
  try {
    const res = fn();
    if (!res.ok) {
      console.warn('[beads]', res.stderr || 'bd command failed');
    }
    return res;
  } catch (err) {
    console.warn('[beads] skipped:', err.message);
    return { ok: false, stdout: '', stderr: err.message };
  }
}
