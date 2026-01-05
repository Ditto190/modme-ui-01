#!/usr/bin/env node
/**
 * Bidirectional sync between toolsets.json and markdown documentation
 * Uses marked for parsing, Handlebars for templating, Ajv for validation
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const Handlebars = require('handlebars');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('length', function(arr) {
  return arr ? arr.length : 0;
});

// Paths
const AGENT_DIR = path.join(__dirname, '../../agent');
const DOCS_DIR = path.join(__dirname, '../../docs/toolsets');
const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const TOOLSETS_JSON = path.join(AGENT_DIR, 'toolsets.json');
const SCHEMA_JSON = path.join(AGENT_DIR, 'toolset-schema.json');
const TEMPLATE_SINGLE = path.join(TEMPLATES_DIR, 'toolset-single.md.hbs');
const TEMPLATE_FULL = path.join(TEMPLATES_DIR, 'toolset-full.md.hbs');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    direction: 'json-to-md', // Default direction
    validateOnly: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--direction' && i + 1 < args.length) {
      options.direction = args[++i];
    } else if (args[i] === '--validate-only') {
      options.validateOnly = true;
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
Usage: node sync-docs.js [options]

Options:
  --direction <dir>    Sync direction: md-to-json, json-to-md (default: json-to-md)
  --validate-only      Only validate, don't sync
  --verbose            Print detailed output
  --help, -h           Show this help message

Examples:
  node sync-docs.js --direction json-to-md
  node sync-docs.js --direction md-to-json --verbose
  node sync-docs.js --validate-only
  `);
}

// Load and compile JSON Schema
function loadSchema() {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_JSON, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    
    const validate = ajv.compile(schema);
    return { schema, validate };
  } catch (error) {
    console.error(`❌ Failed to load schema: ${error.message}`);
    process.exit(1);
  }
}

// Validate toolsets against schema
function validateToolsets(toolsets, validate, verbose = false) {
  const valid = validate(toolsets);
  
  if (verbose) {
    if (valid) {
      console.log(`✅ Toolsets validated: ${toolsets.toolsets.length} toolsets`);
      toolsets.toolsets.forEach(t => console.log(`   - ${t.id}: ${t.name}`));
    } else {
      console.error('❌ Validation errors:');
      validate.errors.forEach(err => {
        console.error(`   ${err.instancePath}: ${err.message}`);
        if (err.params) console.error(`   params:`, err.params);
      });
    }
  }
  
  return valid;
}

// Parse markdown to toolset object
function markdownToToolset(markdownContent, filename) {
  const tokens = marked.lexer(markdownContent);
  
  const toolset = {
    id: path.basename(filename, '.md'),
    name: '',
    description: '',
    tools: [],
    metadata: {}
  };
  
  let currentSection = null;
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        toolset.name = token.text;
      } else if (token.depth === 2) {
        currentSection = token.text.toLowerCase();
      }
    } else if (token.type === 'paragraph' && currentSection === null) {
      toolset.description = token.text;
    } else if (token.type === 'list' && currentSection === 'tools') {
      toolset.tools = token.items.map(item => {
        const match = item.text.match(/`([^`]+)`/);
        return match ? match[1] : item.text;
      });
    }
  }
  
  return toolset;
}

// Sync markdown → JSON
async function syncMarkdownToJson(verbose = false) {
  if (verbose) console.log('📖 Syncing markdown → JSON...\n');
  
  const { validate } = loadSchema();
  const toolsets = { toolsets: [] };
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`❌ Documentation directory not found: ${DOCS_DIR}`);
    return false;
  }
  
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.warn('⚠️  No markdown files found in docs/toolsets/');
    return false;
  }
  
  for (const file of files) {
    const filepath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf8');
    const toolset = markdownToToolset(content, file);
    toolsets.toolsets.push(toolset);
    
    if (verbose) console.log(`   Parsed: ${file} → ${toolset.id}`);
  }
  
  // Validate before writing
  if (!validateToolsets(toolsets, validate, verbose)) {
    console.error('❌ Validation failed. JSON not updated.');
    return false;
  }
  
  // Write JSON
  fs.writeFileSync(TOOLSETS_JSON, JSON.stringify(toolsets, null, 2), 'utf8');
  
  if (verbose) {
    console.log(`\n✅ Successfully synced ${toolsets.toolsets.length} toolsets to JSON`);
  }
  
  return true;
}

// Sync JSON → markdown
async function syncJsonToMarkdown(verbose = false) {
  if (verbose) console.log('📝 Syncing JSON → markdown...\n');
  
  const { validate } = loadSchema();
  
  // Load toolsets.json
  if (!fs.existsSync(TOOLSETS_JSON)) {
    console.error(`❌ Toolsets file not found: ${TOOLSETS_JSON}`);
    return false;
  }
  
  const toolsetsContent = fs.readFileSync(TOOLSETS_JSON, 'utf8');
  const toolsets = JSON.parse(toolsetsContent);
  
  // Validate JSON
  if (!validateToolsets(toolsets, validate, verbose)) {
    console.error('❌ Validation failed. Markdown not generated.');
    return false;
  }
  
  // Load template
  if (!fs.existsSync(TEMPLATE_SINGLE)) {
    console.error(`❌ Template not found: ${TEMPLATE_SINGLE}`);
    return false;
  }
  
  const templateContent = fs.readFileSync(TEMPLATE_SINGLE, 'utf8');
  const template = Handlebars.compile(templateContent);
  
  // Ensure output directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  
  // Generate markdown for each toolset
  for (const toolset of toolsets.toolsets) {
    const markdown = template(toolset);
    const outputPath = path.join(DOCS_DIR, `${toolset.id}.md`);
    fs.writeFileSync(outputPath, markdown, 'utf8');
    
    if (verbose) console.log(`   Generated: ${toolset.id}.md`);
  }
  
  // Generate full reference (optional)
  if (fs.existsSync(TEMPLATE_FULL)) {
    const fullTemplateContent = fs.readFileSync(TEMPLATE_FULL, 'utf8');
    const fullTemplate = Handlebars.compile(fullTemplateContent);
    
    const fullData = {
      toolsets: toolsets.toolsets,
      active_toolsets: toolsets.toolsets.filter(t => t.metadata?.status === 'active'),
      deprecated_toolsets: toolsets.toolsets.filter(t => t.metadata?.status === 'deprecated')
    };
    
    const fullMarkdown = fullTemplate(fullData);
    const fullOutputPath = path.join(DOCS_DIR, 'README.md');
    fs.writeFileSync(fullOutputPath, fullMarkdown, 'utf8');
    
    if (verbose) console.log(`   Generated: README.md`);
  }
  
  if (verbose) {
    console.log(`\n✅ Successfully generated markdown for ${toolsets.toolsets.length} toolsets`);
  }
  
  return true;
}

// Validate both formats
async function validateOnly(verbose = false) {
  if (verbose) console.log('🔍 Validating toolsets...\n');
  
  const { validate } = loadSchema();
  
  if (verbose) console.log('✅ Schema loaded successfully\n');
  
  // Validate JSON
  if (fs.existsSync(TOOLSETS_JSON)) {
    const toolsetsContent = fs.readFileSync(TOOLSETS_JSON, 'utf8');
    const toolsets = JSON.parse(toolsetsContent);
    
    if (verbose) console.log('📋 Validating JSON...');
    const jsonValid = validateToolsets(toolsets, validate, verbose);
    
    if (!jsonValid) {
      console.error('\n❌ JSON validation failed');
      return false;
    }
    
    if (verbose) console.log('✅ JSON is valid\n');
  } else {
    console.warn('⚠️  toolsets.json not found\n');
  }
  
  // Validate markdown files
  if (fs.existsSync(DOCS_DIR)) {
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
    
    if (files.length > 0) {
      if (verbose) console.log('📖 Validating markdown files...');
      
      const tempToolsets = { toolsets: [] };
      
      for (const file of files) {
        const filepath = path.join(DOCS_DIR, file);
        const content = fs.readFileSync(filepath, 'utf8');
        const toolset = markdownToToolset(content, file);
        tempToolsets.toolsets.push(toolset);
      }
      
      const mdValid = validateToolsets(tempToolsets, validate, verbose);
      
      if (!mdValid) {
        console.error('\n❌ Markdown validation failed');
        return false;
      }
      
      if (verbose) console.log('✅ Markdown is valid\n');
    } else {
      console.warn('⚠️  No markdown files found\n');
    }
  } else {
    console.warn('⚠️  docs/toolsets/ directory not found\n');
  }
  
  console.log('✅ All validations passed');
  return true;
}

// Main
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  try {
    if (options.validateOnly) {
      const success = await validateOnly(options.verbose);
      process.exit(success ? 0 : 1);
    } else if (options.direction === 'md-to-json') {
      const success = await syncMarkdownToJson(options.verbose);
      process.exit(success ? 0 : 1);
    } else if (options.direction === 'json-to-md') {
      const success = await syncJsonToMarkdown(options.verbose);
      process.exit(success ? 0 : 1);
    } else {
      console.error(`❌ Invalid direction: ${options.direction}`);
      printHelp();
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}

main();
