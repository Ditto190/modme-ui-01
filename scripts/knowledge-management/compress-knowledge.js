#!/usr/bin/env node
/**
 * Knowledge Base Compression Tool
 *
 * Consolidates scattered documentation into structured knowledge library.
 * Uses Handlebars templates to generate consolidated markdown from JSON.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

// Paths
const ROOT_DIR = path.join(__dirname, '../..');
const LIBRARY_PATH = path.join(ROOT_DIR, 'docs/knowledge-library.json');
const TEMPLATE_PATH = path.join(__dirname, 'templates/consolidated-topic.md.hbs');

console.log('📦 Knowledge Base Compression Tool\n');

// Load knowledge library JSON
if (!fs.existsSync(LIBRARY_PATH)) {
  console.error('❌ Error: knowledge-library.json not found');
  process.exit(1);
}

const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
console.log(`📚 Loaded ${library.topics.length} topics from knowledge library`);

// Load template
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('❌ Error: consolidated-topic.md.hbs template not found');
  process.exit(1);
}

const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const template = Handlebars.compile(templateSource);

let totalOriginalKB = 0;
let totalCompressedKB = 0;
let filesProcessed = 0;

// Generate consolidated documents
library.topics.forEach((topic, index) => {
  console.log(`\n[${index + 1}/${library.topics.length}] Processing: ${topic.name}`);

  // Generate markdown from template
  const markdown = template({
    ...topic,
    last_updated: library.last_updated
  });

  // Ensure output directory exists
  const outputPath = path.join(ROOT_DIR, topic.consolidated_path);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`  📁 Created directory: ${path.relative(ROOT_DIR, outputDir)}`);
  }

  // Write consolidated doc
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`  ✓ Generated: ${topic.consolidated_path}`);
  filesProcessed++;

  // Archive source files
  let archivedCount = 0;
  topic.source_files.forEach(sourceFile => {
    const sourcePath = path.join(ROOT_DIR, sourceFile);
    const archivePath = path.join(ROOT_DIR, 'docs/archive', topic.category, sourceFile);

    if (fs.existsSync(sourcePath)) {
      const archiveDir = path.dirname(archivePath);
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      fs.renameSync(sourcePath, archivePath);
      console.log(`    ↳ Archived: ${sourceFile}`);
      archivedCount++;
    } else {
      console.log(`    ⚠️  Not found: ${sourceFile}`);
    }
  });

  console.log(`  📊 Archived ${archivedCount}/${topic.source_files.length} files`);

  // Track compression stats
  if (topic.metadata) {
    totalOriginalKB += topic.metadata.original_size_kb || 0;
    totalCompressedKB += topic.metadata.compressed_size_kb || 0;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Knowledge compression complete!');
console.log(`\n📊 Statistics:`);
console.log(`  Topics processed: ${filesProcessed}`);
console.log(`  Original size: ${totalOriginalKB}KB`);
console.log(`  Compressed size: ${totalCompressedKB}KB`);
if (totalOriginalKB > 0) {
  const ratio = (totalOriginalKB / totalCompressedKB).toFixed(1);
  const savings = ((1 - totalCompressedKB / totalOriginalKB) * 100).toFixed(0);
  console.log(`  Compression ratio: ${ratio}:1 (${savings}% reduction)`);
}

console.log(`\n📂 Next steps:`);
console.log(`  1. Review generated docs in docs/build-tools/, docs/infrastructure/, etc.`);
console.log(`  2. Check archived files in docs/archive/`);
console.log(`  3. Update cross-references if needed`);
console.log(`  4. Run: npm run validate:knowledge-library`);
console.log('\n');