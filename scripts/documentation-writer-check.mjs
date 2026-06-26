#!/usr/bin/env node
/**
 * Documentation writer quality check — PRD hook + doc parity gates.
 *
 * Usage:
 *   node scripts/documentation-writer-check.mjs [--strict]
 *
 * Validates:
 *   - docs/PRD.yaml exists and parses
 *   - documentation-writer skill + agent restored
 *   - skills_index.json present when .agents/skills has SKILL.md files
 *   - antigravity implementation report references PRD feature
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const PRD_PATH = path.join(ROOT, 'docs', 'PRD.yaml');
const SKILL_PATH = path.join(ROOT, '.agents', 'skills', 'documentation-writer', 'SKILL.md');
const AGENT_PATH = path.join(ROOT, '.github', 'agents', 'documentation-writer.agent.md');
const REPORT_MD = path.join(
  ROOT,
  'docs/inbox-pipeline/reports/antigravity-pattern-adoption.md'
);
const SKILLS_INDEX = path.join(ROOT, 'skills_index.json');
const SKILLS_ROOT = path.join(ROOT, '.agents', 'skills');
const OUT_MD = path.join(ROOT, 'docs/inbox-pipeline/reports/documentation-writer-latest.md');
const OUT_JSON = path.join(ROOT, 'docs/inbox-pipeline/reports/documentation-writer-latest.json');

const findings = [];

function add(severity, code, message, fixHint = '') {
  findings.push({ severity, code, message, fixHint });
}

function countSkillFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countSkillFiles(full);
    else if (entry.name === 'SKILL.md') count++;
  }
  return count;
}

function parsePrdFeatures(raw) {
  const features = [];
  let inFeatures = false;
  for (const line of raw.split('\n')) {
    if (line.startsWith('features:')) {
      inFeatures = true;
      continue;
    }
    if (inFeatures && line.match(/^[a-z_]+:/) && !line.startsWith('  ')) break;
    const nameMatch = line.match(/^\s+- name:\s*(.+)/);
    if (nameMatch) features.push({ name: nameMatch[1].trim(), status: 'unknown' });
    const statusMatch = line.match(/^\s+status:\s*(\w+)/);
    if (statusMatch && features.length) {
      features[features.length - 1].status = statusMatch[1].trim();
    }
  }
  return features;
}

function main() {
  if (!fs.existsSync(PRD_PATH)) {
    add('error', 'PRD_MISSING', 'docs/PRD.yaml not found', 'Create docs/PRD.yaml with feature registry');
  } else {
    const prdRaw = fs.readFileSync(PRD_PATH, 'utf8');
    if (!prdRaw.includes('prd_id:')) {
      add('error', 'PRD_INVALID', 'docs/PRD.yaml missing prd_id', 'Follow gem-documentation-writer PRD format');
    }
    const features = parsePrdFeatures(prdRaw);
    const hybrid = features.find((f) => f.name === 'antigravity-hybrid-skills');
    if (!hybrid) {
      add('warn', 'PRD_FEATURE_MISSING', 'PRD missing antigravity-hybrid-skills feature');
    } else if (hybrid.status !== 'complete' && STRICT) {
      add('error', 'PRD_STATUS', `antigravity-hybrid-skills status is ${hybrid.status}, expected complete`);
    }
  }

  if (!fs.existsSync(SKILL_PATH)) {
    add('error', 'SKILL_MISSING', '.agents/skills/documentation-writer/SKILL.md missing');
  }

  if (!fs.existsSync(AGENT_PATH)) {
    add('error', 'AGENT_MISSING', '.github/agents/documentation-writer.agent.md missing');
  }

  if (!fs.existsSync(REPORT_MD)) {
    add('warn', 'REPORT_MISSING', 'antigravity-pattern-adoption implementation report missing');
  } else {
    const report = fs.readFileSync(REPORT_MD, 'utf8');
    if (!report.includes('docs/PRD.yaml')) {
      add('warn', 'REPORT_PRD_HOOK', 'Implementation report missing PRD.yaml hook reference');
    }
  }

  const skillCount = countSkillFiles(SKILLS_ROOT);
  if (skillCount > 0 && !fs.existsSync(SKILLS_INDEX)) {
    add('error', 'SKILLS_INDEX_STALE', `${skillCount} SKILL.md files but no skills_index.json`, 'Run yarn skills:index');
  }

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warn');
  const status = errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';

  const report = {
    generated_at: new Date().toISOString(),
    source: 'documentation-writer-check',
    status,
    summary: { errors: errors.length, warnings: warnings.length, skill_files: skillCount },
    findings,
    prd_hook: 'docs/PRD.yaml',
  };

  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const md = `# Documentation Writer Quality Report

Generated: ${report.generated_at}
Source: \`documentation-writer-check\`
Status: **${status}**
PRD hook: \`docs/PRD.yaml\`

## Summary

| Metric | Count |
|--------|-------|
| Errors | ${errors.length} |
| Warnings | ${warnings.length} |
| SKILL.md files | ${skillCount} |

## Automation

\`\`\`powershell
yarn docs:writer:check
yarn skills:index
\`\`\`

${findings.length ? '## Findings\n\n' + findings.map((f) => `- **[${f.severity.toUpperCase()}]** \`${f.code}\` — ${f.message}${f.fixHint ? ` → ${f.fixHint}` : ''}`).join('\n') : '_No findings._'}
`;

  fs.writeFileSync(OUT_MD, md, 'utf8');

  console.log(`[documentation-writer-check] ${status} — ${errors.length} errors, ${warnings.length} warnings`);
  console.log(`[documentation-writer-check] Report → ${OUT_MD}`);

  if (errors.length) process.exit(1);
}

main();
