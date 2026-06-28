#!/usr/bin/env node

/**
 * Configure and Link Antigravity Agent Skills
 * 
 * Scans local workspace, legacy GenerativeUI workspace, and manifest-filtered awesome-Antigravity,
 * resolves name conflicts, and creates Windows directory junctions in the global Antigravity folder.
 * 
 * Usage:
 *   node scripts/toolset-management/link-antigravity-skills.js [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Root paths
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const AGENTS_SKILLS_DIR = path.join(WORKSPACE_ROOT, '.agents/skills');
const MANIFEST_PATH = path.join(AGENTS_SKILLS_DIR, '.antigravity-install-manifest.json');
const AWESOME_SKILLS_DIR = path.join(WORKSPACE_ROOT, 'external/awesome-Antigravity/skills');
const GLOBAL_GEMINI_SKILLS_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\dylan', '.gemini/antigravity/skills');

console.log(`\n🚀 Antigravity Agent Skills Configurator`);
console.log(`========================================`);
console.log(`Workspace Root: ${WORKSPACE_ROOT}`);
console.log(`Global Antigravity Skills: ${GLOBAL_GEMINI_SKILLS_DIR}`);
if (DRY_RUN) console.log(`⚠️  DRY RUN MODE - No changes will be written`);
console.log(``);

// Ensure global skills directory exists
if (!DRY_RUN && !fs.existsSync(GLOBAL_GEMINI_SKILLS_DIR)) {
  fs.mkdirSync(GLOBAL_GEMINI_SKILLS_DIR, { recursive: true });
}

// 1. Scan for all directories in the workspace containing a SKILL.md
// excluding .agents, external, and node_modules
function scanWorkspaceForSkills(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Exclusions
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '.agents' ||
        entry.name === 'external' ||
        entry.name === 'out' ||
        entry.name === 'dist' ||
        entry.name === '.next' ||
        entry.name === '.turbo' ||
        entry.name === 'venv' ||
        entry.name === '.venv' ||
        entry.name === 'vendor' ||
        entry.name === '.vendor'
      ) {
        continue;
      }
      
      // If contains SKILL.md
      if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
        result.push({
          name: entry.name,
          path: fullPath
        });
      } else {
        scanWorkspaceForSkills(fullPath, result);
      }
    }
  }
  return result;
}

// Map: skillName => { path, priority }
// Priority values: 1 (awesome-skills), 2 (repo workspace), 3 (local .agents/skills)
const resolvedSkills = new Map();

// --- STEP 1: Add external awesome-Antigravity skills (Priority 1) ---
if (fs.existsSync(MANIFEST_PATH) && fs.existsSync(AWESOME_SKILLS_DIR)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const manifestEntries = manifest.entries || [];
    console.log(`📚 Manifest loaded with ${manifestEntries.length} entries.`);
    
    let matchedCount = 0;
    for (const entryName of manifestEntries) {
      const sourcePath = path.join(AWESOME_SKILLS_DIR, entryName);
      if (fs.existsSync(sourcePath)) {
        resolvedSkills.set(entryName, {
          path: sourcePath,
          priority: 1,
          source: 'awesome-skills'
        });
        matchedCount++;
      }
    }
    console.log(`✅ Loaded ${matchedCount} matching external awesome skills.`);
  } catch (err) {
    console.error(`❌ Error parsing manifest: ${err.message}`);
  }
} else {
  console.log(`⚠️  Manifest or awesome-Antigravity skills dir not found.`);
}

// --- STEP 2: Add repo workspace/GenerativeUI skills (Priority 2) ---
console.log(`🔍 Scanning workspace (excluding .agents and external) for SKILL.md files...`);
const repoSkills = scanWorkspaceForSkills(WORKSPACE_ROOT);
console.log(`✅ Found ${repoSkills.length} skills in the repo codebase.`);
for (const skill of repoSkills) {
  resolvedSkills.set(skill.name, {
    path: skill.path,
    priority: 2,
    source: 'repo-codebase'
  });
  if (VERBOSE) {
    console.log(`  Repo skill: ${skill.name} -> ${skill.path}`);
  }
}

// --- STEP 3: Add local .agents/skills (Priority 3 - Highest) ---
if (fs.existsSync(AGENTS_SKILLS_DIR)) {
  const localEntries = fs.readdirSync(AGENTS_SKILLS_DIR, { withFileTypes: true });
  let localCount = 0;
  for (const entry of localEntries) {
    if (entry.isDirectory()) {
      const sourcePath = path.join(AGENTS_SKILLS_DIR, entry.name);
      if (fs.existsSync(path.join(sourcePath, 'SKILL.md'))) {
        resolvedSkills.set(entry.name, {
          path: sourcePath,
          priority: 3,
          source: 'local-agents'
        });
        localCount++;
      }
    }
  }
  console.log(`✅ Loaded ${localCount} local workspace skills (highest priority).`);
}

console.log(`\n📊 Total unique resolved skills to configure: ${resolvedSkills.size}`);

// --- STEP 4: Create Junctions in Global Antigravity folder ---
console.log(`\n🔧 Configuring links in global Antigravity skills directory...`);

let createdCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const [skillName, info] of resolvedSkills.entries()) {
  const linkPath = path.join(GLOBAL_GEMINI_SKILLS_DIR, skillName);
  
  if (VERBOSE) {
    console.log(`Configuring ${skillName} (${info.source}) -> ${info.path}`);
  }
  
  // Clean up existing link/file if present
  let exists = false;
  let isJunction = false;
  let currentTarget = null;
  
  try {
    const lstats = fs.lstatSync(linkPath);
    exists = true;
    isJunction = lstats.isSymbolicLink() || lstats.isDirectory();
    if (isJunction) {
      currentTarget = fs.readlinkSync(linkPath);
    }
  } catch (e) {
    // Doesn't exist
  }
  
  // If exists and matches correct target, skip
  if (exists && currentTarget && path.resolve(currentTarget) === path.resolve(info.path)) {
    skippedCount++;
    continue;
  }
  
  if (exists) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would delete existing file/link at ${linkPath}`);
    } else {
      try {
        if (fs.lstatSync(linkPath).isDirectory() && !fs.lstatSync(linkPath).isSymbolicLink()) {
          // If it is a real directory (not junction), delete it recursively
          fs.rmSync(linkPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(linkPath);
        }
      } catch (err) {
        console.error(`❌ Failed to remove existing path at ${linkPath}: ${err.message}`);
        errorCount++;
        continue;
      }
    }
  }
  
  // Create junction link
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would link: ${skillName} -> ${info.path}`);
    createdCount++;
  } else {
    try {
      const parentDir = path.dirname(linkPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.symlinkSync(info.path, linkPath, 'junction');
      createdCount++;
      if (VERBOSE) {
        console.log(`✅ Linked: ${skillName}`);
      }
    } catch (err) {
      console.error(`❌ Failed to create junction for ${skillName}: ${err.message}`);
      errorCount++;
    }
  }
}

console.log(`\n🎉 Process Complete!`);
console.log(`Junctions Created/Updated: ${createdCount}`);
console.log(`Junctions Unchanged: ${skippedCount}`);
console.log(`Errors encountered: ${errorCount}`);
console.log(``);
