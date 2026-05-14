#!/usr/bin/env node
/**
 * Knowledge Base Search Tool
 *
 * Fast semantic search across compressed knowledge library.
 * Searches both JSON metadata and consolidated documentation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const LIBRARY_PATH = path.join(ROOT_DIR, 'docs/knowledge-library.json');

// Get search term from command line
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.error('🔍 Knowledge Base Search Tool\n');
  console.error('Usage: node search-knowledge.js <search-term>');
  console.error('\nExample:');
  console.error('  node search-knowledge.js esbuild');
  console.error('  node search-knowledge.js devcontainer');
  console.error('  node search-knowledge.js "build tools"');
  process.exit(1);
}

console.log(`\n🔍 Searching knowledge base for: "${searchTerm}"\n`);

// Load knowledge library
if (!fs.existsSync(LIBRARY_PATH)) {
  console.error('❌ Error: knowledge-library.json not found');
  console.error('Run: node compress-knowledge.js first');
  process.exit(1);
}

const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
const searchLower = searchTerm.toLowerCase();

// Search in JSON library
const results = library.topics.filter(topic => {
  const keywordMatch = topic.keywords?.some(k => k.toLowerCase().includes(searchLower));
  const nameMatch = topic.name.toLowerCase().includes(searchLower);
  const summaryMatch = topic.summary?.toLowerCase().includes(searchLower);
  const categoryMatch = topic.category.toLowerCase().includes(searchLower);

  return keywordMatch || nameMatch || summaryMatch || categoryMatch;
});

if (results.length > 0) {
  console.log(`📚 Found ${results.length} topic(s) in knowledge library:\n`);

  results.forEach((topic, index) => {
    console.log(`${index + 1}. 📝 ${topic.name}`);
    console.log(`   Category: ${topic.category}`);
    console.log(`   Status: ${topic.status}`);
    console.log(`   Path: ${topic.consolidated_path}`);
    console.log(`   Keywords: ${topic.keywords?.join(', ') || 'none'}`);
    console.log(`   Summary: ${topic.summary}`);

    if (topic.commands && Object.keys(topic.commands).length > 0) {
      console.log(`   Quick Commands:`);
      Object.entries(topic.commands).forEach(([key, value]) => {
        console.log(`     - ${key}: ${value}`);
      });
    }
    console.log('');
  });
} else {
  console.log('⚠️  No topics found in knowledge library.');
}

console.log('\n🔎 Search complete!\n');