#!/usr/bin/env node

/**
 * IDE Assistant MCP Migration Script
 * 
 * Applies Smart Coding MCP, Antigravity, and VSCode refactoring
 * configurations to the ModMe GenUI Workbench devcontainer.
 * 
 * Based on: scripts/toolset-management/generate-migration-guide.js
 * 
 * Usage:
 *   node scripts/toolset-management/apply-ide-assistant-migration.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP_SUFFIX = '.backup-' + new Date().toISOString().split('T')[0];

// Paths
const DEVCONTAINER_JSON = path.join(__dirname, '../../.devcontainer/devcontainer.json');
const POST_CREATE_SH = path.join(__dirname, '../../.devcontainer/post-create.sh');
const MCP_CONFIG_DIR = path.join(__dirname, '../../.devcontainer/mcp-servers');
const MCP_CONFIG_JSON = path.join(MCP_CONFIG_DIR, 'config.json');
const CLINERULES_DIR = path.join(__dirname, '../../.clinerules');
const CLINERULES_FILE = path.join(CLINERULES_DIR, '01-smart-mcp.md');
const AGENT_RULES_DIR = path.join(__dirname, '../../.agent/rules');
const AGENT_RULES_FILE = path.join(AGENT_RULES_DIR, 'smart-mcp.md');
const GEMINI_DIR = path.join(__dirname, '../../.gemini/antigravity');
const GEMINI_CONFIG = path.join(GEMINI_DIR, 'mcp_config.json');
const MCP_STARTER_YML = path.join(__dirname, '../../.github/workflows/mcp-starter.yml');

/**
 * Log with emoji prefixes
 */
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

/**
 * Backup file if it exists
 */
function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + BACKUP_SUFFIX;
    if (DRY_RUN) {
      log('📋', `Would backup: ${path.basename(filePath)} → ${path.basename(backupPath)}`);
    } else {
      fs.copyFileSync(filePath, backupPath);
      log('✅', `Backed up: ${path.basename(filePath)}`);
    }
    return true;
  }
  return false;
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    if (DRY_RUN) {
      log('📋', `Would create directory: ${dirPath}`);
    } else {
      fs.mkdirSync(dirPath, { recursive: true });
      log('✅', `Created directory: ${dirPath}`);
    }
  }
}

/**
 * Write JSON file with pretty formatting
 */
function writeJSON(filePath, data) {
  if (DRY_RUN) {
    log('📋', `Would write: ${path.basename(filePath)}`);
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    log('✅', `Wrote: ${path.basename(filePath)}`);
  }
}

/**
 * Update devcontainer.json
 */
function updateDevcontainer() {
  log('🔧', 'Updating devcontainer.json...');
  
  backupFile(DEVCONTAINER_JSON);
  
  const devcontainer = JSON.parse(fs.readFileSync(DEVCONTAINER_JSON, 'utf8'));
  
  // Add refactoring settings
  if (!devcontainer.customizations) devcontainer.customizations = {};
  if (!devcontainer.customizations.vscode) devcontainer.customizations.vscode = {};
  if (!devcontainer.customizations.vscode.settings) devcontainer.customizations.vscode.settings = {};
  
  devcontainer.customizations.vscode.settings['editor.lightbulb.enable'] = true;
  devcontainer.customizations.vscode.settings['editor.codeActionsOnSave'] = {
    'source.organizeImports': 'always',
    'source.fixAll.eslint': 'explicit',
    'source.sortImports': 'explicit'
  };
  
  // Add keybindings
  if (!devcontainer.customizations.vscode.keybindings) {
    devcontainer.customizations.vscode.keybindings = [];
  }
  
  const keybindings = [
    {
      "key": "ctrl+shift+r",
      "command": "editor.action.codeAction",
      "args": { "kind": "refactor" }
    },
    {
      "key": "ctrl+shift+r ctrl+e",
      "command": "editor.action.codeAction",
      "args": { "kind": "refactor.extract.function", "apply": "first" }
    }
  ];
  
  devcontainer.customizations.vscode.keybindings.push(...keybindings);
  
  // Add MCP config mount
  if (!devcontainer.mounts) devcontainer.mounts = [];
  
  const mcpMount = 'source=${localWorkspaceFolder}/.devcontainer/mcp-servers,target=/home/vscode/.config/mcp,type=bind,consistency=cached';
  if (!devcontainer.mounts.includes(mcpMount)) {
    devcontainer.mounts.push(mcpMount);
  }
  
  writeJSON(DEVCONTAINER_JSON, devcontainer);
}

/**
 * Update post-create.sh
 */
function updatePostCreate() {
  log('🔧', 'Updating post-create.sh...');
  
  backupFile(POST_CREATE_SH);
  
  let script = fs.readFileSync(POST_CREATE_SH, 'utf8');
  
  const mcpInstall = `
# Install Smart Coding MCP
echo "📦 Installing Smart Coding MCP..."
npm install -g smart-coding-mcp

# Verify installation
npx smart-coding-mcp --version

echo "✅ Smart Coding MCP installed!"
`;
  
  if (!script.includes('smart-coding-mcp')) {
    script += mcpInstall;
    
    if (DRY_RUN) {
      log('📋', 'Would update post-create.sh');
    } else {
      fs.writeFileSync(POST_CREATE_SH, script, 'utf8');
      log('✅', 'Updated post-create.sh');
    }
  } else {
    log('ℹ️', 'post-create.sh already includes Smart Coding MCP');
  }
}

/**
 * Create MCP server config
 */
function createMCPConfig() {
  log('🔧', 'Creating MCP server config...');
  
  ensureDir(MCP_CONFIG_DIR);
  
  const mcpConfig = {
    "mcpServers": {
      "smart-coding-mcp": {
        "command": "npx",
        "args": ["-y", "smart-coding-mcp", "--workspace", "${workspaceFolder}"],
        "env": { "NODE_ENV": "development" }
      },
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
      },
      "git": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "${workspaceFolder}"]
      }
    },
    "transport": "stdio"
  };
  
  writeJSON(MCP_CONFIG_JSON, mcpConfig);
}

/**
 * Create Cline rules
 */
function createClineRules() {
  log('🔧', 'Creating Cline rules...');
  
  ensureDir(CLINERULES_DIR);
  
  const rules = `---
trigger: always_on
description: Mandatory usage of Smart Coding MCP tools for dependencies and search
---

# Smart Coding MCP Usage Rules

You must prioritize using the **Smart Coding MCP** tools for the following tasks.

## 1. Dependency Management

**Trigger:** When checking, adding, or updating package versions (npm, python, go, rust, etc.).

**Action:**
- **MUST** use the \`d_check_last_version\` tool.
- **DO NOT** guess versions or trust internal training data.
- **DO NOT** use generic web search unless \`d_check_last_version\` fails.

## 2. Codebase Research

**Trigger:** When asking about "how" something works, finding logic, or understanding architecture.

**Action:**
- **MUST** use \`a_semantic_search\` as the FIRST tool for any codebase research
- **DO NOT** use \`Glob\` or \`Grep\` for exploratory searches
- Use \`Grep\` ONLY for exact literal string matching (e.g., finding a specific error message)
- Use \`Glob\` ONLY when you already know the exact filename pattern

## 3. Environment & Status

**Trigger:** When starting a session or debugging the environment.

**Action:**
- Use \`e_set_workspace\` if the current workspace path is incorrect.
- Use \`f_get_status\` to verify the MCP server is healthy and indexed.
`;
  
  if (DRY_RUN) {
    log('📋', 'Would write .clinerules/01-smart-mcp.md');
  } else {
    fs.writeFileSync(CLINERULES_FILE, rules, 'utf8');
    log('✅', 'Created .clinerules/01-smart-mcp.md');
  }
}

/**
 * Create Antigravity/Agent rules
 */
function createAgentRules() {
  log('🔧', 'Creating Agent rules...');
  
  ensureDir(AGENT_RULES_DIR);
  
  const rules = `---
trigger: always_on
description: Mandatory usage of Smart Coding MCP tools for dependencies and search
---

# Smart Coding MCP Usage Rules

You must prioritize using the **Smart Coding MCP** tools for the following tasks.

## 1. Dependency Management

**Trigger:** When checking, adding, or updating package versions (npm, python, go, rust, etc.).

**Action:**
- **MUST** use the \`d_check_last_version\` tool.
- **DO NOT** guess versions or trust internal training data.
- **DO NOT** use generic web search unless \`d_check_last_version\` fails.

## 2. Codebase Research

**Trigger:** When asking about "how" something works, finding logic, or understanding architecture.

**Action:**
- **MUST** use \`a_semantic_search\` as the FIRST tool for any codebase research
- **DO NOT** use \`Glob\` or \`Grep\` for exploratory searches
- Use \`Grep\` ONLY for exact literal string matching (e.g., finding a specific error message)
- Use \`Glob\` ONLY when you already know the exact filename pattern

## 3. Environment & Status

**Trigger:** When starting a session or debugging the environment.

**Action:**
- Use \`e_set_workspace\` if the current workspace path is incorrect.
- Use \`f_get_status\` to verify the MCP server is healthy and indexed.
`;
  
  if (DRY_RUN) {
    log('📋', 'Would write .agent/rules/smart-mcp.md');
  } else {
    fs.writeFileSync(AGENT_RULES_FILE, rules, 'utf8');
    log('✅', 'Created .agent/rules/smart-mcp.md');
  }
}

/**
 * Create Antigravity/Gemini config
 */
function createGeminiConfig() {
  log('🔧', 'Creating Gemini/Antigravity config...');
  
  ensureDir(GEMINI_DIR);
  
  const workspacePath = path.resolve(__dirname, '../..');
  
  const geminiConfig = {
    "mcpServers": {
      "smart-coding-mcp": {
        "command": "npx",
        "args": ["-y", "smart-coding-mcp", "--workspace", workspacePath]
      }
    }
  };
  
  writeJSON(GEMINI_CONFIG, geminiConfig);
  
  log('⚠️', `Note: Antigravity requires absolute paths. Update ${GEMINI_CONFIG} with your workspace path.`);
}

/**
 * Update GitHub workflow
 */
function updateMCPStarter() {
  log('🔧', 'Updating mcp-starter.yml...');
  
  backupFile(MCP_STARTER_YML);
  
  let workflow = fs.readFileSync(MCP_STARTER_YML, 'utf8');
  
  const mcpTest = `
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Smart Coding MCP
        run: |
          npm install -g smart-coding-mcp
          npx smart-coding-mcp --version

      - name: Test MCP Server Health
        run: |
          npx smart-coding-mcp --workspace . --test || echo "⚠️ Smart Coding MCP test failed"
`;
  
  if (!workflow.includes('smart-coding-mcp')) {
    // Insert after checkout step
    workflow = workflow.replace(
      '- uses: actions/checkout@v4',
      '- uses: actions/checkout@v4' + mcpTest
    );
    
    if (DRY_RUN) {
      log('📋', 'Would update mcp-starter.yml');
    } else {
      fs.writeFileSync(MCP_STARTER_YML, workflow, 'utf8');
      log('✅', 'Updated mcp-starter.yml');
    }
  } else {
    log('ℹ️', 'mcp-starter.yml already includes Smart Coding MCP');
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('');
  log('📋', '═══════════════════════════════════════');
  log('📋', 'Migration Summary');
  log('📋', '═══════════════════════════════════════');
  console.log('');
  
  if (DRY_RUN) {
    log('ℹ️', 'DRY RUN - No files were modified');
    console.log('');
    log('ℹ️', 'To apply changes, run:');
    console.log('  node scripts/toolset-management/apply-ide-assistant-migration.js');
  } else {
    log('✅', 'Migration complete!');
    console.log('');
    log('📝', 'Next steps:');
    console.log('  1. Review changes in backed-up files');
    console.log('  2. Rebuild devcontainer: Ctrl+Shift+P → "Dev Containers: Rebuild"');
    console.log('  3. Test Smart Coding MCP: npx smart-coding-mcp --version');
    console.log('  4. Test refactoring: Ctrl+Shift+R in any TypeScript file');
    console.log('');
    log('📚', 'Documentation: docs/migration/IDE_ASSISTANT_MCP_INTEGRATION.md');
  }
  
  console.log('');
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('');
    log('🚀', 'IDE Assistant MCP Migration');
    log('🚀', '═══════════════════════════════════════');
    console.log('');
    
    if (DRY_RUN) {
      log('ℹ️', 'Running in DRY RUN mode - no files will be modified');
      console.log('');
    }
    
    updateDevcontainer();
    updatePostCreate();
    createMCPConfig();
    createClineRules();
    createAgentRules();
    createGeminiConfig();
    updateMCPStarter();
    
    printSummary();
    
  } catch (error) {
    console.error('');
    log('❌', 'Migration failed:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
