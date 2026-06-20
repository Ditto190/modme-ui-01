#!/usr/bin/env node
/**
 * Generate Mermaid diagrams showing toolset relationships
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const AGENT_DIR = path.join(__dirname, '../../agent');
const DOCS_DIR = path.join(__dirname, '../../docs/toolsets');
const TOOLSETS_JSON = path.join(AGENT_DIR, 'toolsets.json');
const OUTPUT_MMD = path.join(DOCS_DIR, 'toolset-relationships.mmd');
const OUTPUT_SVG = path.join(DOCS_DIR, 'toolset-relationships.svg');

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    format: 'svg', // mmd, svg, png, pdf
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: node generate-diagram.js [options]

Options:
  --format <fmt>    Output format: mmd, svg, png, pdf (default: svg)
  --verbose         Print detailed output
  --help, -h        Show this help message

Examples:
  node generate-diagram.js --format svg
  node generate-diagram.js --format png --verbose
  `);
}

// Load toolsets
function loadToolsets() {
  if (!fs.existsSync(TOOLSETS_JSON)) {
    throw new Error(`Toolsets file not found: ${TOOLSETS_JSON}`);
  }

  const content = fs.readFileSync(TOOLSETS_JSON, 'utf8');
  return JSON.parse(content);
}

// Sanitize ID for Mermaid
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Generate Mermaid diagram
function generateMermaid(toolsets, verbose = false) {
  if (verbose) console.log('🎨 Generating Mermaid diagram...\n');

  let mermaid = 'graph TD\n';
  
  // Add nodes
  for (const toolset of toolsets.toolsets) {
    const sanitizedId = sanitizeId(toolset.id);
    const status = toolset.metadata?.status || 'active';
    const name = toolset.name.replace(/"/g, '\\"');
    
    // Node label with status emoji
    let emoji = '🟢';
    if (status === 'deprecated') emoji = '🔴';
    else if (status === 'experimental') emoji = '🟡';
    else if (status === 'beta') emoji = '🟠';
    
    mermaid += `    ${sanitizedId}["${name}<br/>${emoji} ${status}"];\n`;
    
    if (verbose) console.log(`   Node: ${sanitizedId} (${status})`);
  }
  
  mermaid += '\n';
  
  // Add edges
  for (const toolset of toolsets.toolsets) {
    const sanitizedId = sanitizeId(toolset.id);
    
    // Dependencies (requires)
    if (toolset.metadata?.requires && toolset.metadata.requires.length > 0) {
      for (const req of toolset.metadata.requires) {
        const sanitizedReq = sanitizeId(req);
        mermaid += `    ${sanitizedId} -->|requires| ${sanitizedReq};\n`;
        if (verbose) console.log(`   Edge: ${sanitizedId} --> ${sanitizedReq} (requires)`);
      }
    }
    
    // Related toolsets
    if (toolset.metadata?.related_toolsets && toolset.metadata.related_toolsets.length > 0) {
      for (const related of toolset.metadata.related_toolsets) {
        const sanitizedRelated = sanitizeId(related);
        mermaid += `    ${sanitizedId} -.->|related| ${sanitizedRelated};\n`;
        if (verbose) console.log(`   Edge: ${sanitizedId} -.-> ${sanitizedRelated} (related)`);
      }
    }
    
    // Deprecation chain
    if (toolset.metadata?.deprecated?.superseded_by) {
      const supersededBy = sanitizeId(toolset.metadata.deprecated.superseded_by);
      mermaid += `    ${sanitizedId} -.->|superseded by| ${supersededBy};\n`;
      if (verbose) console.log(`   Edge: ${sanitizedId} -.-> ${supersededBy} (superseded)`);
    }
  }
  
  mermaid += '\n';
  
  // Styling
  for (const toolset of toolsets.toolsets) {
    const sanitizedId = sanitizeId(toolset.id);
    const status = toolset.metadata?.status || 'active';
    
    if (status === 'active') {
      mermaid += `    style ${sanitizedId} fill:#4ade80,stroke:#16a34a,color:#000;\n`;
    } else if (status === 'deprecated') {
      mermaid += `    style ${sanitizedId} fill:#ef4444,stroke:#dc2626,stroke-dasharray: 5 5,color:#fff;\n`;
    } else if (status === 'experimental') {
      mermaid += `    style ${sanitizedId} fill:#facc15,stroke:#eab308,color:#000;\n`;
    } else if (status === 'beta') {
      mermaid += `    style ${sanitizedId} fill:#fb923c,stroke:#f97316,color:#000;\n`;
    }
  }
  
  return mermaid;
}

// Convert to image using mermaid-cli
function convertToImage(mmdPath, format, verbose = false) {
  if (format === 'mmd') {
    if (verbose) console.log('\n✅ Mermaid diagram saved (no conversion needed)');
    return;
  }
  
  const outputPath = mmdPath.replace('.mmd', `.${format}`);
  
  try {
    if (verbose) console.log(`\n🔄 Converting to ${format.toUpperCase()}...`);
    
    execSync(`npx mmdc -i "${mmdPath}" -o "${outputPath}" -t neutral -b transparent`, {
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    if (verbose) console.log(`✅ Diagram saved: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to convert to ${format}: ${error.message}`);
    if (verbose) console.error(error.stack);
    process.exit(1);
  }
}

// Generate statistics
function generateStatistics(toolsets) {
  const stats = {
    total: toolsets.toolsets.length,
    byStatus: {},
    byCategory: {},
    totalTools: 0,
    totalDependencies: 0
  };
  
  for (const toolset of toolsets.toolsets) {
    const status = toolset.metadata?.status || 'active';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    
    const category = toolset.metadata?.category || 'unknown';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    
    stats.totalTools += toolset.tools.length;
    stats.totalDependencies += (toolset.metadata?.requires?.length || 0);
  }
  
  return stats;
}

function printStatistics(stats, verbose = false) {
  if (!verbose) return;
  
  console.log('\n📊 Toolset Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total Toolsets:    ${stats.total}`);
  console.log(`  Active:            ${stats.byStatus.active || 0}`);
  console.log(`  Deprecated:        ${stats.byStatus.deprecated || 0}`);
  console.log(`  Experimental:      ${stats.byStatus.experimental || 0}`);
  console.log(`  Beta:              ${stats.byStatus.beta || 0}`);
  console.log('');
  console.log('📂 By Category:');
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category}:`.padEnd(20) + count);
  }
  console.log('');
  console.log(`🔧 Tools:            ${stats.totalTools}`);
  console.log(`🔗 Dependencies:     ${stats.totalDependencies}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  try {
    // Load toolsets
    const toolsets = loadToolsets();
    
    if (options.verbose) {
      console.log(`✅ Loaded ${toolsets.toolsets.length} toolsets\n`);
    }
    
    // Generate diagram
    const mermaid = generateMermaid(toolsets, options.verbose);
    
    // Ensure output directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    
    // Write .mmd file
    fs.writeFileSync(OUTPUT_MMD, mermaid, 'utf8');
    
    if (options.verbose) {
      console.log(`\n✅ Mermaid file saved: ${OUTPUT_MMD}`);
    }
    
    // Convert to image
    convertToImage(OUTPUT_MMD, options.format, options.verbose);
    
    // Print statistics
    const stats = generateStatistics(toolsets);
    printStatistics(stats, options.verbose);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}

main();
