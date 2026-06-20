#!/usr/bin/env node
/**
 * install-agents.mjs — Comprehensive agent/skill installer for Monorepo_ModMe
 *
 * Usage:
 *   node scripts/install-agents.mjs --help
 *   node scripts/install-agents.mjs --collection scripts/collections/modme-core.collection.json
 *   node scripts/install-agents.mjs --agent github-actions-expert
 *   node scripts/install-agents.mjs --skill quality-playbook
 *   node scripts/install-agents.mjs --dry-run --collection ...
 *   node scripts/install-agents.mjs --list-vendors
 *   node scripts/install-agents.mjs --search "accessibility"
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const VENDOR_DIR = join(REPO_ROOT, '.vendor', 'awesome-copilot-main');
const AGENTS_DIR = join(REPO_ROOT, '.agents', 'skills');
const REPORT_PATH = join(REPO_ROOT, '.agents', 'install-report.json');
const UPSTREAM_URL = 'https://github.com/github/awesome-copilot.git';
const SKILLSH_API = 'https://skills.sh/api';

function parseArgs(argv) {
  const args = { dryRun: false, verbose: false, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--force' || a === '-f') args.force = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--list-vendors') args.listVendors = true;
    else if (a === '--popular') args.popular = true;
    else if ((a === '--collection' || a === '-c') && argv[i+1]) args.collection = argv[++i];
    else if ((a === '--agent' || a === '-a') && argv[i+1]) args.agent = argv[++i];
    else if ((a === '--skill' || a === '-s') && argv[i+1]) args.skill = argv[++i];
    else if (a === '--search' && argv[i+1]) args.search = argv[++i];
    else if ((a === '--details' || a === '-d') && argv[i+1]) args.details = argv[++i];
    else if (a === '--export-collection' && argv[i+1]) args.exportCollection = argv[++i];
    else if ((a === '--output' || a === '-o') && argv[i+1]) args.output = argv[++i];
  }
  return args;
}

const log = {
  info: (m) => console.log(`  ${m}`),
  ok:   (m) => console.log(`✅ ${m}`),
  skip: (m) => console.log(`⏭  ${m}`),
  warn: (m) => console.warn(`⚠️  ${m}`),
  err:  (m) => console.error(`❌ ${m}`),
  dry:  (m) => console.log(`💧 [DRY] ${m}`),
  head: (m) => console.log(`\n─── ${m} ───`),
};

function sha256(fp) {
  try { return createHash('sha256').update(readFileSync(fp)).digest('hex'); } catch { return null; }
}

function loadReport(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return { version: 1, installed: [], lastRun: null }; }
}

function saveReport(report, p, dryRun) {
  report.lastRun = new Date().toISOString();
  if (dryRun) { log.dry(`Would write report → ${p}`); return; }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(report, null, 2));
  log.ok(`Report → ${p}`);
}

function resolveAsset(relPath, cloneDir) {
  const vp = join(VENDOR_DIR, relPath);
  if (existsSync(vp)) return { path: vp, source: 'vendor' };
  if (cloneDir) {
    const cp = join(cloneDir, relPath);
    if (existsSync(cp)) return { path: cp, source: 'github' };
  }
  return null;
}

function cloneRepo(url, dir) {
  log.info(`Cloning ${url} → ${dir}`);
  execSync(`git clone --depth 1 --quiet "${url}" "${dir}"`, { stdio: 'inherit' });
}

function kindFromPath(p) {
  if (p.startsWith('skills/')) return 'skill';
  if (p.startsWith('agents/')) return 'agent';
  if (p.startsWith('instructions/')) return 'instruction';
  if (p.startsWith('prompts/')) return 'prompt';
  return 'unknown';
}

function slugFrom(item) {
  const kind = item.kind || kindFromPath(item.path);
  if (kind === 'skill') {
    // path is "skills/NAME/SKILL.md" → use NAME segment
    const parts = item.path.replace(/\\/g, '/').split('/');
    if (parts.length >= 2) return parts[1];
  }
  return basename(item.path, extname(item.path))
    .replace(/\.(agent|skill|prompt|instructions)$/, '')
    .replace(/[^a-zA-Z0-9\-_.]/g, '-');
}

function updateReport(report, entry) {
  const idx = report.installed.findIndex(r => r.slug === entry.slug);
  if (idx >= 0) report.installed[idx] = entry;
  else report.installed.push(entry);
}

function installSkillDir(srcDir, destDir, slug, item, opts, report) {
  // Local-only skill already installed at destDir
  if (srcDir === destDir) {
    log.skip(`${slug} — local install, not in vendor`); return 'skipped';
  }
  const skillMd = join(srcDir, 'SKILL.md');
  if (!existsSync(skillMd)) { log.warn(`No SKILL.md in ${srcDir}`); return 'not-found'; }
  const srcHash = sha256(skillMd);
  const existing = report.installed.find(r => r.slug === slug);
  if (!opts.force && existing && existsSync(join(destDir, 'SKILL.md')) && sha256(join(destDir, 'SKILL.md')) === srcHash) {
    log.skip(`${slug} — up to date`); return 'skipped';
  }
  if (opts.dryRun) { log.dry(`Would copy skill dir → ${destDir}`); return 'dry-run'; }
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDir, destDir, { recursive: true, force: true });
  log.ok(`Installed skill: ${slug}`);
  updateReport(report, { slug, kind: 'skill', path: item.path, dest: destDir, hash: srcHash, source: item._source || 'vendor', installedAt: new Date().toISOString() });
  return 'installed';
}

function installItem(item, srcPath, opts, report) {
  const kind = item.kind || kindFromPath(item.path);
  const slug = slugFrom(item);
  const destDir = join(AGENTS_DIR, slug);

  // Already installed locally (local-only source)
  if (item._source === 'local') {
    log.skip(`${slug} — local install (not in vendor)`); return 'skipped';
  }

  if (kind === 'skill') {
    const srcDir = statSync(srcPath).isDirectory() ? srcPath : dirname(srcPath);
    return installSkillDir(srcDir, destDir, slug, item, opts, report);
  }

  // Single file (agent / instruction / prompt)
  const destFile = join(destDir, 'SKILL.md');
  if (!existsSync(srcPath)) { log.warn(`Source not found: ${srcPath}`); return 'not-found'; }
  const srcHash = sha256(srcPath);
  const existing = report.installed.find(r => r.slug === slug);
  if (!opts.force && existing && existsSync(destFile) && sha256(destFile) === srcHash) {
    log.skip(`${slug} — up to date`); return 'skipped';
  }
  if (opts.dryRun) { log.dry(`Would install ${kind} → ${destFile}`); return 'dry-run'; }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(srcPath, destFile);
  log.ok(`Installed ${kind}: ${slug}`);
  updateReport(report, { slug, kind, path: item.path, dest: destFile, hash: srcHash, source: item._source || 'vendor', installedAt: new Date().toISOString() });
  return 'installed';
}

function resolveSrcForItem(item, cloneDir) {
  const kind = item.kind || kindFromPath(item.path);
  const slug = slugFrom(item);

  // If already installed locally, treat as 'local' source (skip vendor/clone lookup)
  const localDest = join(AGENTS_DIR, slug);
  if (existsSync(join(localDest, 'SKILL.md'))) {
    item._source = 'local';
    return localDest;
  }

  if (kind === 'skill') {
    const skillDirRel = dirname(item.path);
    const r1 = resolveAsset(skillDirRel, cloneDir);
    if (r1 && statSync(r1.path).isDirectory()) { item._source = r1.source; return r1.path; }
    const r2 = resolveAsset(item.path, cloneDir);
    if (r2) { item._source = r2.source; return r2.path; }
    return null;
  }
  const r = resolveAsset(item.path, cloneDir);
  if (r) { item._source = r.source; return r.path; }
  return null;
}

async function installCollection(collectionPath, opts, report) {
  log.head(`Collection: ${basename(collectionPath)}`);
  if (!existsSync(collectionPath)) { log.err(`Not found: ${collectionPath}`); process.exit(1); }
  const col = JSON.parse(readFileSync(collectionPath, 'utf8'));
  log.info(`${col.name} — ${col.items.length} items`);
  if (col.tags) log.info(`Tags: ${col.tags.join(', ')}`);

  let cloneDir = null;
  const needsClone = !existsSync(VENDOR_DIR) && col.items.some(i => !resolveAsset(i.path));
  if (needsClone) {
    cloneDir = join(process.env.TEMP || '/tmp', `awesomec-${Date.now()}`);
    cloneRepo(UPSTREAM_URL, cloneDir);
  }

  const r = { installed: 0, skipped: 0, notFound: 0, dryRun: 0 };
  for (const item of col.items) {
    const srcPath = resolveSrcForItem(item, cloneDir);
    if (!srcPath) { log.warn(`Not resolved: ${item.path}`); r.notFound++; continue; }
    const status = installItem(item, srcPath, opts, report);
    r[status === 'installed' ? 'installed' : status === 'skipped' ? 'skipped' : status === 'dry-run' ? 'dryRun' : 'notFound']++;
  }

  if (cloneDir && existsSync(cloneDir)) {
    try { execSync(`rmdir /s /q "${cloneDir}"`, { stdio: 'ignore', shell: true }); } catch {}
  }

  log.head('Results');
  console.log(`  ✅ installed: ${r.installed}`);
  console.log(`  ⏭  skipped:   ${r.skipped}`);
  console.log(`  ❓ not-found: ${r.notFound}`);
  if (opts.dryRun) console.log(`  💧 dry-run:   ${r.dryRun}`);
  return r;
}

async function installNamedAgent(name, opts, report) {
  log.head(`Agent: ${name}`);
  const relPath = name.includes('/') ? name : `agents/${name}.agent.md`;
  let res = resolveAsset(relPath);
  if (!res) {
    // Fuzzy match in vendor
    const agentDir = join(VENDOR_DIR, 'agents');
    if (existsSync(agentDir)) {
      const matches = readdirSync(agentDir).filter(f => f.includes(name.toLowerCase()));
      if (matches.length) {
        log.info(`Fuzzy matches: ${matches.slice(0,5).join(', ')}`);
        for (const m of matches.slice(0, 3)) {
          const it = { path: `agents/${m}`, kind: 'agent' };
          const sp = resolveAsset(it.path)?.path;
          if (sp) installItem(it, sp, opts, report);
        }
        return;
      }
    }
    log.err(`Not found: ${name}`); process.exit(1);
  }
  installItem({ path: relPath, kind: 'agent' }, res.path, opts, report);
}

async function installNamedSkill(name, opts, report) {
  log.head(`Skill: ${name}`);
  const skillDir = join(VENDOR_DIR, 'skills', name);
  if (existsSync(skillDir)) {
    installItem({ path: `skills/${name}/SKILL.md`, kind: 'skill', _source: 'vendor' }, skillDir, opts, report);
  } else {
    log.err(`Not found in vendor: skills/${name}`);
    log.info('Use --list-vendors to browse available skills.');
    process.exit(1);
  }
}

function listVendors() {
  log.head('Vendor contents');
  if (!existsSync(VENDOR_DIR)) { log.warn('Vendor dir missing'); return; }

  const agentDir = join(VENDOR_DIR, 'agents');
  const skillDir = join(VENDOR_DIR, 'skills');
  const instrDir = join(VENDOR_DIR, 'instructions');

  if (existsSync(agentDir)) {
    const agents = readdirSync(agentDir).filter(f => f.endsWith('.agent.md'));
    console.log(`\n  Agents (${agents.length}):`);
    agents.slice(0, 25).forEach(a => console.log(`    ${a.replace('.agent.md','')}`));
    if (agents.length > 25) console.log(`    ... and ${agents.length - 25} more (use --search)`);
  }
  if (existsSync(skillDir)) {
    const skills = readdirSync(skillDir).filter(d => existsSync(join(skillDir, d, 'SKILL.md')));
    console.log(`\n  Skills with SKILL.md (${skills.length}):`);
    skills.slice(0, 25).forEach(s => console.log(`    ${s}`));
    if (skills.length > 25) console.log(`    ... and ${skills.length - 25} more`);
  }
  if (existsSync(instrDir)) {
    const instrs = readdirSync(instrDir).filter(f => f.endsWith('.instructions.md'));
    console.log(`\n  Instructions (${instrs.length}):`);
    instrs.slice(0, 10).forEach(i => console.log(`    ${i.replace('.instructions.md','')}`));
  }

  const otherVendors = join(REPO_ROOT, '.vendor');
  const others = readdirSync(otherVendors).filter(d => d !== 'awesome-copilot-main');
  if (others.length) {
    console.log('\n  Other vendor repos:');
    others.forEach(d => console.log(`    .vendor/${d}`));
  }

  const collections = join(REPO_ROOT, 'scripts', 'collections');
  if (existsSync(collections)) {
    const cols = readdirSync(collections).filter(f => f.endsWith('.collection.json'));
    console.log(`\n  Built-in collections (${cols.length}):`);
    cols.forEach(c => console.log(`    scripts/collections/${c}`));
  }

  const installed = readdirSync(AGENTS_DIR).filter(d => existsSync(join(AGENTS_DIR, d, 'SKILL.md')));
  console.log(`\n  Currently installed (${installed.length} in .agents/skills/):`);
  installed.forEach(d => console.log(`    ${d}`));
}

async function searchSkills(query) {
  log.head(`Search: "${query}"`);
  try {
    const res = await fetch(`${SKILLSH_API}/skills/search?q=${encodeURIComponent(query)}&limit=20`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const skills = data.skills || data.results || data || [];
    if (!Array.isArray(skills) || !skills.length) { log.info('No results from skills.sh'); }
    else skills.forEach(s => console.log(`  ${s.name || s.skillId} (${s.installs || '?'} installs)`));
  } catch (e) {
    log.warn(`skills.sh unreachable (${e.message}) — falling back to vendor`);
    const skillDir = join(VENDOR_DIR, 'skills');
    if (existsSync(skillDir)) {
      const q = query.toLowerCase();
      const matches = readdirSync(skillDir).filter(d => d.includes(q));
      console.log(`\n  Vendor matches (${matches.length}):`);
      matches.forEach(m => console.log(`    ${m}`));
    }
    const agentDir = join(VENDOR_DIR, 'agents');
    if (existsSync(agentDir)) {
      const q = query.toLowerCase();
      const matches = readdirSync(agentDir).filter(f => f.includes(q)).map(f => f.replace('.agent.md',''));
      if (matches.length) {
        console.log(`\n  Vendor agent matches (${matches.length}):`);
        matches.forEach(m => console.log(`    ${m}`));
      }
    }
  }
}

async function skillDetails(slug) {
  log.head(`Skill details: "${slug}"`);
  try {
    const res = await fetch(`${SKILLSH_API}/skills/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const s = await res.json();
    console.log(`  Name:        ${s.name || slug}`);
    console.log(`  Installs:    ${s.installs ?? '?'}`);
    if (s.description) console.log(`  Description: ${s.description}`);
    if (s.source)      console.log(`  Source:      ${s.source}`);
    if (s.installCmd)  console.log(`  Install:     ${s.installCmd}`);
    else               console.log(`  Install:     node scripts/install-agents.mjs --skill ${slug}`);
  } catch (e) {
    log.warn(`skills.sh unreachable (${e.message}) — checking vendor`);
    const vendorPath = join(VENDOR_DIR, 'skills', slug);
    if (existsSync(join(vendorPath, 'SKILL.md'))) {
      const content = readFileSync(join(vendorPath, 'SKILL.md'), 'utf8').split('\n').slice(0, 20).join('\n');
      console.log(`\n  [Vendor] ${slug}/SKILL.md:\n${content}`);
    } else {
      log.err(`Not found: "${slug}"`);
    }
  }
}

function exportCollection(outputPath, report) {
  log.head(`Export collection → ${outputPath}`);
  const installed = report.installed || [];
  if (!installed.length) { log.warn('No installed items found in report'); return; }
  const items = installed.map(r => ({
    path: r.path || (r.kind === 'skill' ? `skills/${r.slug}/SKILL.md` : `agents/${r.slug}.agent.md`),
    kind: r.kind || 'skill',
    name: r.slug,
  }));
  const col = {
    name: 'exported-collection',
    description: `Exported from .agents/install-report.json on ${new Date().toISOString().slice(0,10)}`,
    version: '1.0.0',
    tags: ['exported'],
    items,
  };
  const out = resolve(outputPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(col, null, 2));
  log.ok(`Exported ${items.length} items → ${out}`);
}

async function popularSkills() {
  log.head('Popular skills (skills.sh)');
  try {
    const res = await fetch(`${SKILLSH_API}/skills/popular?limit=20`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const skills = data.skills || data || [];
    skills.forEach((s, i) => console.log(`  ${String(i+1).padStart(2)}. ${s.name || s.skillId} — ${s.installs||'?'} installs`));
  } catch (e) {
    log.warn(`skills.sh unreachable: ${e.message}`);
  }
}

function showHelp() {
  console.log(`
install-agents.mjs — Vendor-first agent/skill installer for Monorepo_ModMe

Usage:
  node scripts/install-agents.mjs [options]

Options:
  -c, --collection <path>   Install from collection manifest JSON
  -a, --agent <name>        Install a single agent by name (fuzzy match supported)
  -s, --skill <name>        Install a single skill by name
  -n, --dry-run             Preview without writing
  -f, --force               Re-install even if hash matches
  -v, --verbose             Verbose output
  -o, --output <path>       Override install-report.json path
  --list-vendors            List available agents/skills in .vendor/ + installed
  --search <query>          Search skills.sh (vendor fallback if offline)
  -d, --details <slug>      Show skill details + install command from skills.sh
  --popular                 Show popular skills from skills.sh
  --export-collection <p>   Export current installs as a collection.json

Collections:
  scripts/collections/modme-core.collection.json       — core agents + skills
  scripts/collections/modme-frontend.collection.json   — React/Next.js/a11y
  scripts/collections/modme-devops.collection.json     — CI/CD/security
  scripts/collections/modme-inbox-mda.collection.json  — Inbox/MDA pipeline

Vendor-first: checks .vendor/awesome-copilot-main/ before cloning from GitHub.
Report:       .agents/install-report.json tracks all installs with hashes.
Schema:       .vendor/awesome-copilot-main/.schemas/collection.schema.json
`);
}

async function main() {
  const args = parseArgs(process.argv);
  const reportPath = args.output ? resolve(args.output) : REPORT_PATH;

  if (args.help) { showHelp(); return; }
  if (args.listVendors) { listVendors(); return; }
  if (args.search) { await searchSkills(args.search); return; }
  if (args.details) { await skillDetails(args.details); return; }
  if (args.popular) { await popularSkills(); return; }

  if (!args.collection && !args.agent && !args.skill && !args.exportCollection) {
    showHelp(); process.exit(1);
  }

  const report = loadReport(reportPath);
  const opts = { dryRun: args.dryRun, force: args.force, verbose: args.verbose };

  if (args.collection) await installCollection(resolve(args.collection), opts, report);
  if (args.agent) await installNamedAgent(args.agent, opts, report);
  if (args.skill) await installNamedSkill(args.skill, opts, report);
  if (args.exportCollection) exportCollection(args.exportCollection, report);

  saveReport(report, reportPath, args.dryRun);
}

main().catch(e => { console.error(e); process.exit(1); });
