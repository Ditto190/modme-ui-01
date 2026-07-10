/**
 * Beads CLI hooks for intake pipeline orchestration (subprocess, prefix modme).
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function runBd(args) {
  if (process.env.BEADS_DISABLED === '1') {
    return { ok: true, skipped: true };
  }
  const result = spawnSync('npx', ['--yes', '@beads/bd', ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.warn(`[beads] bd ${args.join(' ')} → ${result.stderr || result.stdout || result.status}`);
    return { ok: false, output: result.stderr || result.stdout };
  }
  return { ok: true, output: result.stdout?.trim() };
}

export async function beadsCreate(title, options = {}) {
  const args = ['create', title, '--prefix', 'modme'];
  if (options.priority) args.push('--priority', String(options.priority));
  return runBd(args);
}

export async function beadsUpdate(title, status, note) {
  const args = ['update', title, '--status', status];
  if (note) args.push('--comment', note);
  return runBd(args);
}

export async function beadsReady() {
  return runBd(['ready']);
}

export async function beadsClose(issueId, note) {
  const args = ['update', issueId, '--status', 'done'];
  if (note) args.push('--comment', note);
  return runBd(args);
}

export async function beadsCreateSchemaDrift(path) {
  return beadsCreate(`schema-drift:${path}`, { priority: 1 });
}

/**
 * Link GitHub/GitLab issue URL to a beads issue via comment.
 * @param {string} issueId - modme-xxxx
 * @param {string} url - external issue URL
 */
export async function beadsLinkExternal(issueId, url) {
  const note = `external_issue: ${url}`;
  return runBd(['update', issueId, '--comment', note]);
}

/**
 * Promote beads task to GitHub handoff (comment + optional new beads note).
 * @param {string} title - GitHub issue title
 * @param {string} beadsId - modme-xxxx
 * @param {string} [githubIssueUrl] - after issue created
 */
export async function beadsPromoteToIssue(title, beadsId, githubIssueUrl) {
  const parts = [`promoted_to_github: ${title}`];
  if (githubIssueUrl) parts.push(`github_sor: ${githubIssueUrl}`);
  const note = parts.join(' | ');
  return runBd(['update', beadsId, '--comment', note]);
}
