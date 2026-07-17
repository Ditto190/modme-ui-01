#!/usr/bin/env node
/**
 * Smoke-test Defuddle CLI (--json) vs hosted Copy-as-MD API (defuddle.md).
 * Writes one inbox-contract note for side-by-side comparison.
 *
 * Usage:
 *   node scripts/defuddle-smoke.mjs [url]
 *   yarn defuddle:smoke
 *   yarn defuddle:smoke -- https://stephango.com/saw
 *
 * Requires network + npx (no permanent defuddle dependency).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INBOX_DIR } from './lib/inbox-contract.mjs';

const DEFAULT_URL = 'https://stephango.com/saw';

function parseArgs(argv) {
  const args = argv.filter((a) => a !== '--');
  return { url: args[0] || DEFAULT_URL };
}

function safeSlug(text) {
  return String(text || 'untitled')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'untitled';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampParts(d = new Date()) {
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const iso = d.toISOString();
  return { stamp, iso };
}

function urlToDefuddleApiPath(urlString) {
  const u = new URL(urlString);
  const path = `${u.host}${u.pathname}${u.search}`.replace(/\/$/, '');
  return `https://defuddle.md/${path}`;
}

function runDefuddleJson(url) {
  const isWin = process.platform === 'win32';
  const args = ['--yes', 'defuddle', 'parse', url, '--markdown', '--json'];
  const result = isWin
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npx', ...args], {
      encoding: 'utf8',
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    })
    : spawnSync('npx', args, {
      encoding: 'utf8',
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
    });
  if (result.error) {
    throw new Error(`npx defuddle spawn failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim();
    throw new Error(`npx defuddle parse failed (exit ${result.status}): ${err}`);
  }
  const out = (result.stdout || '').trim();
  try {
    return JSON.parse(out);
  } catch {
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(out.slice(start, end + 1));
    }
    throw new Error('defuddle --json did not return parseable JSON');
  }
}

async function fetchCopyAsMd(url) {
  const apiUrl = urlToDefuddleApiPath(url);
  const res = await fetch(apiUrl, {
    headers: { Accept: 'text/markdown, text/plain, */*' },
  });
  if (!res.ok) {
    throw new Error(`defuddle.md fetch failed: ${res.status} ${res.statusText} (${apiUrl})`);
  }
  return { apiUrl, markdown: await res.text() };
}

function yamlQuote(value) {
  const s = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (!s) return "''";
  if (/[:#\[\]{},&*?|>!%@`]/.test(s) || s.includes('\n') || s.includes("'")) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  }
  return s;
}

function buildNote({ url, cli, copyMd, stamp, iso }) {
  const title = cli.title || cli.meta?.title || 'Defuddle smoke';
  const summary =
    cli.description ||
    cli.meta?.description ||
    'Defuddle CLI --json vs defuddle.md Copy-as-MD smoke compare';
  const author = cli.author || '';
  const words = cli.wordCount ?? cli.words ?? '';
  const site = cli.site || '';
  const cliContent =
    typeof cli.content === 'string'
      ? cli.content
      : typeof cli.markdown === 'string'
        ? cli.markdown
        : JSON.stringify(cli, null, 2);

  const tags = ['clipper', 'defuddle-probe', 'smoke'];

  return `---
timestamp: ${iso}
agent: human
agent_role: researcher
type: research
severity: low
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
title: ${yamlQuote(title)}
summary: ${yamlQuote(summary)}
source: ${yamlQuote(url)}
site: ${yamlQuote(site)}
author: ${yamlQuote(author)}
words: ${yamlQuote(String(words))}
---

# ${title}

**URL:** ${url}
**Smoke:** \`npx defuddle parse --json\` vs \`curl\`/\`fetch\` ${copyMd.apiUrl}

## CLI metadata (defuddle --json)

\`\`\`json
${JSON.stringify(
    {
      title: cli.title,
      author: cli.author,
      description: cli.description,
      site: cli.site,
      wordCount: cli.wordCount ?? cli.words,
      published: cli.published,
    },
    null,
    2
  )}
\`\`\`

## CLI content (Defuddle Markdown)

${cliContent}

## Copy-as-MD API (\`defuddle.md\`)

Fetched from: ${copyMd.apiUrl}

\`\`\`markdown
${copyMd.markdown}
\`\`\`

## Diff hint

Compare CLI content vs Copy-as-MD body. Clipper \`{{content}}\` uses the same Defuddle extraction locally in-browser.
`;
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  new URL(url);

  console.log(`defuddle-smoke: URL ${url}`);
  console.log('defuddle-smoke: running npx defuddle parse --markdown --json …');
  const cli = runDefuddleJson(url);

  console.log('defuddle-smoke: fetching defuddle.md Copy-as-MD …');
  const copyMd = await fetchCopyAsMd(url);

  const { stamp, iso } = timestampParts();
  const title = cli.title || 'Defuddle smoke';
  const filename = `${stamp}_research_researcher_${safeSlug(title)}.md`;
  mkdirSync(INBOX_DIR, { recursive: true });
  const outPath = join(INBOX_DIR, filename);
  const note = buildNote({ url, cli, copyMd, stamp, iso });
  writeFileSync(outPath, note, 'utf8');

  console.log(`defuddle-smoke: wrote ${outPath}`);
  console.log('defuddle-smoke: commit with git add -f if needed (inbox is gitignored)');
}

main().catch((err) => {
  console.error(`defuddle-smoke: ${err.message || err}`);
  process.exit(1);
});
