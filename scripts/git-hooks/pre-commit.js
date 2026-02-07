#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(__dirname, '../../docs/inbox');

console.log('🔍 Checking for documents in inbox...');

if (!fs.existsSync(INBOX_DIR)) {
  console.log('✓ No inbox directory');
  process.exit(0);
}

const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'INDEX.md');

if (files.length === 0) {
  console.log('✓ Inbox is empty - proceeding with commit');
  process.exit(0);
}

console.log(`📥 Found ${files.length} documents in inbox`);
console.log('🤖 Running knowledge base pipeline...\n');

try {
  console.log('Step 1: Categorizing documents...');
  execSync('npm run inbox:categorize', { stdio: 'inherit', cwd: path.join(__dirname, '../../') });
  
  console.log('\nStep 2: Moving files to root...');
  files.forEach(file => {
    const source = path.join(INBOX_DIR, file);
    const dest = path.join(__dirname, '../../', file);
    fs.renameSync(source, dest);
    console.log(`  Moved: ${file}`);
  });
  
  console.log('\nStep 3: Compressing documentation...');
  execSync('npm run compress:knowledge', { stdio: 'inherit', cwd: path.join(__dirname, '../../') });
  
  console.log('\nStep 4: Staging changes for commit...');
  execSync('git add docs/ *.md', { stdio: 'inherit', cwd: path.join(__dirname, '../../') });
  
  console.log('\n✅ Knowledge base updated and staged!');
  console.log('📦 Compressed files are ready to commit\n');
  
} catch (error) {
  console.error('\n❌ Pipeline failed:', error.message);
  console.error('\nYou can manually run: npm run inbox:process');
  console.error('Or skip with: git commit --no-verify\n');
  process.exit(1);
}