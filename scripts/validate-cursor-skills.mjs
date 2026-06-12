#!/usr/bin/env node
/**
 * Validates awesome-cursor-skills install integrity.
 * Usage: node scripts/validate-cursor-skills.mjs [--strict]
 *
 * --strict  Fail if global ~/.cursor/skills copies drift from vendor sources
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const VENDOR_ACS = join(ROOT, ".vendor", "awesome-cursor-skills-main", "resources");
const VENDOR_SUPERPOWERS = join(ROOT, ".vendor", "superpowers-main", "skills");
const GLOBAL_SKILLS = join(homedir(), ".cursor", "skills");
const PROJECT_POINTERS = join(ROOT, ".cursor", "skills");

const ACS_SKILLS = [
  "systematic-debugging",
  "visual-qa-testing",
  "creating-pr",
  "grinding-until-pass",
  "verifying-in-browser",
  "finding-dev-server-url",
  "detecting-port-conflicts",
  "suggesting-cursor-rules",
  "suggesting-cursor-hooks",
  "suggesting-skills",
  "auto-type-checking",
  "babysitting-pr",
  "writing-commit-messages",
  "parallel-exploring",
  "best-of-n-solving",
  "monitoring-terminal-errors",
  "parallel-code-review",
  "codebase-onboarding",
  "writing-tests",
];

const SUPERPOWERS_SKILLS = [
  "systematic-debugging",
  "test-driven-development",
  "verification-before-completion",
];

const PROJECT_POINTERS_REQUIRED = [
  "antigravity-awesome-skills"
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseSkillMeta(skillMdPath) {
  const raw = readFileSync(skillMdPath, "utf8");
  const name =
    raw.match(/^name:\s*(.+)$/m)?.[1]?.trim() ??
    raw.match(/^---[\s\S]*?name:\s*(.+)$/m)?.[1]?.trim();
  const description =
    raw.match(/^description:\s*(.+)$/m)?.[1]?.trim() ??
    raw.match(/^desc:\s*(.+)$/m)?.[1]?.trim() ??
    raw.match(/^---[\s\S]*?description:\s*(.+)$/m)?.[1]?.trim();
  const hasBody = raw.replace(/^---[\s\S]*?---\s*/m, "").trim().length > 20;
  return { name, description, hasBody, raw };
}

function validateSkillDir(dir, label) {
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) {
    fail(`${label}: missing SKILL.md at ${dir}`);
    return null;
  }
  const meta = parseSkillMeta(skillMd);
  if (!meta.name) {
    fail(`${label}: SKILL.md missing name field`);
  }
  if (!meta.description) {
    fail(`${label}: SKILL.md missing description/desc field`);
  }
  if (!meta.hasBody) {
    warn(`${label}: SKILL.md body looks very short`);
  }
  const folderName = dir.split(/[/\\]/).pop();
  if (meta.name && folderName && meta.name !== folderName) {
    warn(`${label}: folder "${folderName}" differs from name "${meta.name}"`);
  }
  return meta;
}

function validateVendorAndGlobal(skillName, vendorRoot) {
  const vendorDir = join(vendorRoot, skillName);
  const globalDir = join(GLOBAL_SKILLS, skillName);

  if (!existsSync(vendorDir)) {
    fail(`vendor missing skill: ${skillName} (${vendorDir})`);
    return;
  }

  validateSkillDir(vendorDir, `vendor:${skillName}`);

  if (!existsSync(globalDir)) {
    fail(`global install missing: ${skillName} (${globalDir})`);
    return;
  }

  validateSkillDir(globalDir, `global:${skillName}`);

  const vendorMd = join(vendorDir, "SKILL.md");
  const globalMd = join(globalDir, "SKILL.md");
  if (existsSync(vendorMd) && existsSync(globalMd)) {
    const vHash = hashFile(vendorMd);
    const gHash = hashFile(globalMd);
    if (vHash !== gHash) {
      warn(`drift: ${skillName} global SKILL.md differs from vendor`);
    }
  }
}

const projectOnly = process.argv.includes("--project-only");
const strict = process.argv.includes("--strict");

if (projectOnly) {
  for (const pointer of PROJECT_POINTERS_REQUIRED) {
    const dir = join(PROJECT_POINTERS, pointer);
    if (!existsSync(dir)) {
      fail(`project pointer missing: .cursor/skills/${pointer}/`);
      continue;
    }
    validateSkillDir(dir, `project:${pointer}`);
  }
  if (!existsSync(VENDOR_ACS)) {
    fail(`Vendor catalog not found: ${VENDOR_ACS} — run scripts/cursor-ai/setup.ps1`);
  }
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`skills-check: ${e}`);
    }
    process.exit(1);
  }
  console.log(
    `skills-check: OK (project-only) — ${PROJECT_POINTERS_REQUIRED.length} project pointers`,
  );
  process.exit(0);
}

// Vendor tree exists
if (!existsSync(VENDOR_ACS)) {
  fail(`Vendor catalog not found: ${VENDOR_ACS} — run scripts/cursor-ai/setup.ps1`);
}

// ACS skills
for (const skill of ACS_SKILLS) {
  validateVendorAndGlobal(skill, VENDOR_ACS);
}

// Superpowers (vendor optional if only global copies exist)
for (const skill of SUPERPOWERS_SKILLS) {
  const globalDir = join(GLOBAL_SKILLS, skill);
  if (!existsSync(globalDir)) {
    fail(`global install missing (superpowers): ${skill}`);
    continue;
  }
  validateSkillDir(globalDir, `global:${skill}`);
  const vendorDir = join(VENDOR_SUPERPOWERS, skill);
  if (existsSync(vendorDir)) {
    const vMd = join(vendorDir, "SKILL.md");
    const gMd = join(globalDir, "SKILL.md");
    if (existsSync(vMd) && existsSync(gMd) && hashFile(vMd) !== hashFile(gMd)) {
      warn(`drift: ${skill} superpowers global differs from vendor`);
    }
  }
}

// Project pointer skills
for (const pointer of PROJECT_POINTERS_REQUIRED) {
  const dir = join(PROJECT_POINTERS, pointer);
  if (!existsSync(dir)) {
    fail(`project pointer missing: .cursor/skills/${pointer}/`);
    continue;
  }
  const meta = validateSkillDir(dir, `project:${pointer}`);
  if (meta?.raw && !meta.raw.includes("spencerpauly") && pointer === "awesome-cursor-skills") {
    warn("project:awesome-cursor-skills does not reference spencerpauly catalog URL");
  }
}

// Catalog coverage: count vendor skills not in install set
if (existsSync(VENDOR_ACS)) {
  const allVendor = readdirSync(VENDOR_ACS).filter((entry) => {
    try {
      return statSync(join(VENDOR_ACS, entry)).isDirectory();
    } catch {
      return false;
    }
  });
  const notInstalled = allVendor.filter((s) => !ACS_SKILLS.includes(s));
  if (notInstalled.length > 0) {
    warnings.push(
      `info: ${notInstalled.length} vendor skills not in curated install set (e.g. ${notInstalled.slice(0, 3).join(", ")})`,
    );
  }
}

if (strict && warnings.some((w) => w.startsWith("drift:"))) {
  fail("--strict: global skills drift from vendor sources — re-run setup.ps1");
}

for (const w of warnings) {
  console.warn(`skills-check: warning — ${w}`);
}

if (errors.length > 0) {
  for (const e of errors) {
    console.error(`skills-check: ${e}`);
  }
  process.exit(1);
}

console.log(
  `skills-check: OK — ${ACS_SKILLS.length} awesome-cursor-skills, ` +
    `${SUPERPOWERS_SKILLS.length} superpowers, ` +
    `${PROJECT_POINTERS_REQUIRED.length} project pointers`,
);
