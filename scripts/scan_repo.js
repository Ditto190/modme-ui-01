#!/usr/bin/env node

/**
 * Repository Scanner & Knowledge Base Generator
 * 
 * Purpose: Scan entire project and create a searchable knowledge base
 * that Claude can query to understand the codebase structure, patterns,
 * and documentation.
 * 
 * Usage: node scan-repo.js [path] [output-file]
 */

const fs = require('fs');
const path = require('path');

/**
 * Categorize files by type
 */
function categorizeFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  // Documentation
  if (ext === '.md') {
    if (fileName.includes('devcontainer')) return { type: 'documentation', category: 'devcontainer' };
    if (fileName.includes('integration')) return { type: 'documentation', category: 'integration' };
    if (fileName.includes('architecture')) return { type: 'architecture', category: 'architecture' };
    if (fileName.includes('implementation') || fileName.includes('checklist')) {
      return { type: 'documentation', category: 'implementation' };
    }
    return { type: 'documentation', category: 'general' };
  }

  // Configuration
  if (ext === '.json' || ext === '.yml' || ext === '.yaml') {
    if (fileName.includes('devcontainer')) return { type: 'configuration', category: 'devcontainer' };
    if (fileName.includes('package.json')) return { type: 'configuration', category: 'npm' };
    if (fileName.includes('tsconfig')) return { type: 'configuration', category: 'typescript' };
    if (fileName.includes('mcp')) return { type: 'configuration', category: 'mcp' };
    return { type: 'configuration', category: 'other' };
  }

  // Workflows
  if (ext === '.yml' || ext === '.yaml') {
    if (filePath.includes('.github/workflows')) {
      return { type: 'workflow', category: 'github-actions' };
    }
  }

  // Architecture/Code
  if (ext === '.ts' || ext === '.tsx') {
    if (fileName.includes('schema-crawler')) return { type: 'code', category: 'schema-generation' };
    if (fileName.includes('registry-fetcher')) return { type: 'code', category: 'registry' };
    if (fileName.includes('molecule-generator')) return { type: 'code', category: 'ui-generation' };
    return { type: 'code', category: 'typescript' };
  }

  if (ext === '.py') {
    return { type: 'code', category: 'python' };
  }

  // Data
  if (ext === '.json') {
    if (fileName.includes('package.json')) return { type: 'data', category: 'package-manifest' };
    return { type: 'data', category: 'json-data' };
  }

  return { type: 'code', category: 'other' };
}

/**
 * Extract summary from content
 */
function extractSummary(content, limit = 300) {
  // Get first meaningful section
  const lines = content
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));

  let summary = '';
  for (const line of lines) {
    if (summary.length + line.length < limit) {
      summary += line + ' ';
    } else {
      break;
    }
  }

  return summary.slice(0, limit).trim() + (summary.length > limit ? '...' : '');
}

/**
 * Scan directory recursively
 */
function scanDirectory(dirPath, baseDir) {
  const entries = [];

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      // Skip common unimportant directories
      if (['.git', 'node_modules', '.venv', '__pycache__', '.next', 'dist', 'build', '.github/workflows'].some(skip => file.includes(skip))) {
        continue;
      }

      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      const relativePath = path.relative(baseDir, filePath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories (but limit depth)
        if (relativePath.split(path.sep).length < 5) {
          entries.push(...scanDirectory(filePath, baseDir));
        }
      } else {
        // Check if it's a file we care about
        const ext = path.extname(file).toLowerCase();
        const supportedExts = ['.md', '.ts', '.tsx', '.js', '.py', '.json', '.yml', '.yaml'];

        if (supportedExts.includes(ext)) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const { type, category } = categorizeFile(filePath);

            entries.push({
              path: relativePath,
              type,
              language: ext.slice(1),
              size: stat.size,
              lastModified: stat.mtime.toISOString(),
              category,
              content: content.slice(0, 5000), // First 5000 chars for indexing
              summary: extractSummary(content),
            });
          } catch (err) {
            console.warn(`Warning: Could not read ${filePath}: ${err && err.message ? err.message : err}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dirPath}:`, err && err.message ? err.message : err);
  }

  return entries;
}

/**
 * Build search index
 */
function buildIndex(files) {
  const index = {
    byType: {},
    byCategory: {},
    byLanguage: {},
  };

  for (const file of files) {
    // Index by type
    if (!index.byType[file.type]) index.byType[file.type] = [];
    index.byType[file.type].push(file.path);

    // Index by category
    if (!index.byCategory[file.category]) index.byCategory[file.category] = [];
    index.byCategory[file.category].push(file.path);

    // Index by language
    if (!index.byLanguage[file.language]) index.byLanguage[file.language] = [];
    index.byLanguage[file.language].push(file.path);
  }

  return index;
}

/**
 * Find devcontainer files
 */
function findDevcontainer(files) {
  const devcontainerFiles = files.filter(f =>
    f.path.includes('devcontainer') || f.path.includes('.devcontainer')
  );

  if (devcontainerFiles.length > 0) {
    return {
      found: true,
      location: devcontainerFiles.map(f => f.path).join(', '),
      summary: devcontainerFiles.map(f => f.summary).join(' '),
    };
  }

  return { found: false };
}

/**
 * Generate summary
 */
function generateSummary(files, index) {
  const stats = {
    total: files.length,
    documentation: (index.byType && index.byType.documentation) ? index.byType.documentation.length : 0,
    code: (index.byType && index.byType.code) ? index.byType.code.length : 0,
    configuration: (index.byType && index.byType.configuration) ? index.byType.configuration.length : 0,
    architecture: (index.byType && index.byType.architecture) ? index.byType.architecture.length : 0,
  };

  return `
Project Repository Summary
==========================

Total Files Scanned: ${stats.total}
- Documentation: ${stats.documentation} files
- Code: ${stats.code} files
- Configuration: ${stats.configuration} files
- Architecture: ${stats.architecture} files

Key Categories:
${
  Object.entries(index.byCategory || {})
    .map(([cat, files]) => `- ${cat}: ${files.length} files`)
    .join('\n')
}

Languages Used:
${
  Object.entries(index.byLanguage || {})
    .map(([lang, files]) => `- ${lang}: ${files.length} files`)
    .join('\n')
}
`;
}

/**
 * Main function
 */
function main() {
  const projectPath = process.argv[2] || '/mnt/project';
  const outputFile = process.argv[3] || 'knowledge-base.json';

  console.log(`🔍 Scanning repository: ${projectPath}`);

  // Scan
  const files = scanDirectory(projectPath, projectPath);

  console.log(`📝 Found ${files.length} relevant files`);

  // Build index
  const index = buildIndex(files);

  // Find devcontainer
  const devcontainer = findDevcontainer(files);

  // Generate summary
  const summary = generateSummary(files, index);

  // Create knowledge base
  const knowledgeBase = {
    metadata: {
      scanDate: new Date().toISOString(),
      projectPath,
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      fileTypes: Object.fromEntries(
        Object.entries(index.byType || {}).map(([type, paths]) => [type, paths.length])
      ),
    },
    files,
    index,
    devcontainer,
    summary,
  };

  // Write to file
  fs.writeFileSync(outputFile, JSON.stringify(knowledgeBase, null, 2));

  console.log(`✅ Knowledge base created: ${outputFile}`);
  console.log(summary);

  if (devcontainer.found) {
    console.log(`\n🐳 DEVCONTAINER FOUND at: ${devcontainer.location}`);
  } else {
    console.log(`\n⚠️  No devcontainer.json found in project`);
  }

  return knowledgeBase;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scanDirectory, buildIndex, generateSummary, findDevcontainer, main };