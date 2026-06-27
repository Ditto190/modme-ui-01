import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(REPO_ROOT, '.agents', 'skills');
const MANIFEST_PATH = join(SKILLS_DIR, '.antigravity-install-manifest.json');

console.log('🔄 Synchronizing installed skills/agents with manifest...');

if (!existsSync(SKILLS_DIR)) {
  console.error(`❌ Skills directory not found: ${SKILLS_DIR}`);
  process.exit(1);
}

// 1. Get all installed skill directory names
const installedSkills = readdirSync(SKILLS_DIR).filter(name => {
  if (name.startsWith('.')) return false;
  const fullPath = join(SKILLS_DIR, name);
  return statSync(fullPath).isDirectory();
});

console.log(`📂 Found ${installedSkills.length} directories in ${SKILLS_DIR}`);

// 2. Load existing manifest or initialize one
let manifest = { schemaVersion: 1, updatedAt: new Date().toISOString(), entries: [] };
if (existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    console.warn(`⚠️ Error reading manifest, initializing a new one: ${err.message}`);
  }
}

// Ensure entries exists
if (!Array.isArray(manifest.entries)) {
  manifest.entries = [];
}

const originalCount = manifest.entries.length;

function sanitizeSkillFrontmatter(skillPath, folderName) {
  if (!existsSync(skillPath)) return;
  const content = readFileSync(skillPath, 'utf8');
  const parts = content.split('---');
  if (parts.length >= 3) {
    let frontmatter = parts[1];
    const expectedName = folderName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    
    const nameRegex = /^(name:\s*)(['"]?)([^'"\r\n]+)(['"]?)/m;
    const match = frontmatter.match(nameRegex);
    
    if (match) {
      const currentName = match[3].trim();
      const currentNameSanitized = currentName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (currentName !== expectedName || currentNameSanitized !== expectedName) {
        console.log(`🔧 Sanitizing name in ${folderName}/SKILL.md frontmatter: "${currentName}" -> "${expectedName}"`);
        frontmatter = frontmatter.replace(nameRegex, `name: ${expectedName}`);
        parts[1] = frontmatter;
        const newContent = parts.join('---');
        writeFileSync(skillPath, newContent, 'utf8');
      }
    } else {
      console.log(`➕ Adding missing name field to ${folderName}/SKILL.md frontmatter: name: ${expectedName}`);
      frontmatter = `name: ${expectedName}\n` + frontmatter.trim() + '\n';
      parts[1] = frontmatter;
      const newContent = parts.join('---');
      writeFileSync(skillPath, newContent, 'utf8');
    }
  }
}

// 3. Add any missing folders and sanitize frontmatter names
let addedCount = 0;
for (const skill of installedSkills) {
  const skillPath = join(SKILLS_DIR, skill, 'SKILL.md');
  sanitizeSkillFrontmatter(skillPath, skill);

  if (!manifest.entries.includes(skill)) {
    manifest.entries.push(skill);
    addedCount++;
    console.log(`➕ Adding: ${skill}`);
  }
}

// 4. Sort entries alphabetically for consistency
manifest.entries.sort();
manifest.updatedAt = new Date().toISOString();

// 5. Save back
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\n🎉 Done! Registered ${addedCount} new skills. Total registered: ${manifest.entries.length} (original: ${originalCount}).`);

