#!/usr/bin/env node

/**
 * Detect Toolset Changes
 * 
 * Compares current agent code with registered toolsets to detect changes.
 * Used by toolset-update.yml workflow.
 * 
 * Outputs JSON to stdout:
 * {
 *   "has_changes": boolean,
 *   "new_toolsets": string[],
 *   "modified_toolsets": string[],
 *   "removed_toolsets": string[]
 * }
 */

const fs = require('fs');
const path = require('path');

const AGENT_FILE = path.join(__dirname, '../../agent/main.py');
const REGISTRY_FILE = path.join(__dirname, '../../agent/toolsets.json');

/**
 * Parse Python agent code to extract tool definitions
 * @param {string} agentCode - Python source code
 * @returns {Object} Map of tool names to their definitions
 */
function extractToolsFromAgent(agentCode) {
  const tools = {};
  
  // Match function definitions with tool decorators or ToolContext parameter
  // Pattern: def tool_name(tool_context: ToolContext, ...):
  const toolPattern = /def\s+([a-z_][a-z0-9_]*)\s*\([^)]*tool_context\s*:\s*ToolContext/gi;
  
  let match;
  while ((match = toolPattern.exec(agentCode)) !== null) {
    const toolName = match[1];
    
    // Extract docstring for description
    const funcStart = match.index + match[0].length;
    const docstringMatch = agentCode.slice(funcStart).match(/^\s*"""([^"]*)"""/);
    const description = docstringMatch ? docstringMatch[1].trim() : '';
    
    tools[toolName] = {
      name: toolName,
      description: description.split('\n')[0], // First line only
      location: `agent/main.py:${agentCode.slice(0, match.index).split('\n').length}`
    };
  }
  
  return tools;
}

/**
 * Group tools into logical toolsets based on naming patterns
 * @param {Object} tools - Map of tool names to definitions
 * @returns {Object} Map of toolset IDs to tool arrays
 */
function inferToolsets(tools) {
  const toolsets = {};
  
  for (const [toolName, toolDef] of Object.entries(tools)) {
    let toolsetId = 'general';
    
    // Infer toolset from naming patterns
    if (toolName.includes('ui_element') || toolName.includes('canvas')) {
      toolsetId = 'ui_elements';
    } else if (toolName.includes('theme') || toolName.includes('color')) {
      toolsetId = 'theme';
    } else if (toolName.includes('data') || toolName.includes('table')) {
      toolsetId = 'data_analysis';
    } else if (toolName.includes('chart') || toolName.includes('visualization')) {
      toolsetId = 'visualization';
    }
    
    if (!toolsets[toolsetId]) {
      toolsets[toolsetId] = [];
    }
    toolsets[toolsetId].push(toolName);
  }
  
  return toolsets;
}

/**
 * Load registered toolsets from JSON
 * @returns {Object} Registered toolsets
 */
function loadRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return { toolsets: [] };
    }
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch (error) {
    console.error(`Error loading registry: ${error.message}`, { stream: 'stderr' });
    return { toolsets: [] };
  }
}

/**
 * Compare current tools with registry to detect changes
 * @param {Object} currentToolsets - Current toolsets inferred from code
 * @param {Object} registry - Registered toolsets
 * @returns {Object} Change detection results
 */
function detectChanges(currentToolsets, registry) {
  const registeredIds = new Set(registry.toolsets.map(ts => ts.id));
  const currentIds = new Set(Object.keys(currentToolsets));
  
  const newToolsets = Array.from(currentIds).filter(id => !registeredIds.has(id));
  const removedToolsets = Array.from(registeredIds).filter(id => !currentIds.has(id));
  const modifiedToolsets = [];
  
  // Check for modifications (tools added/removed from existing toolsets)
  for (const [id, tools] of Object.entries(currentToolsets)) {
    if (registeredIds.has(id)) {
      const registered = registry.toolsets.find(ts => ts.id === id);
      const currentTools = new Set(tools);
      const registeredTools = new Set(registered.tools || []);
      
      if (currentTools.size !== registeredTools.size ||
          Array.from(currentTools).some(t => !registeredTools.has(t))) {
        modifiedToolsets.push(id);
      }
    }
  }
  
  return {
    has_changes: newToolsets.length > 0 || modifiedToolsets.length > 0 || removedToolsets.length > 0,
    new_toolsets: newToolsets,
    modified_toolsets: modifiedToolsets,
    removed_toolsets: removedToolsets,
    current_toolsets: currentToolsets
  };
}

/**
 * Main execution
 */
function main() {
  try {
    // Read agent code
    if (!fs.existsSync(AGENT_FILE)) {
      throw new Error(`Agent file not found: ${AGENT_FILE}`);
    }
    
    const agentCode = fs.readFileSync(AGENT_FILE, 'utf8');
    
    // Extract tools and infer toolsets
    const tools = extractToolsFromAgent(agentCode);
    const currentToolsets = inferToolsets(tools);
    
    // Load registry
    const registry = loadRegistry();
    
    // Detect changes
    const changes = detectChanges(currentToolsets, registry);
    
    // Output results as JSON
    console.log(JSON.stringify(changes, null, 2));
    
    // Exit with appropriate code
    process.exit(changes.has_changes ? 1 : 0);
    
  } catch (error) {
    console.error(`Error: ${error.message}`, { stream: 'stderr' });
    console.error(error.stack, { stream: 'stderr' });
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { extractToolsFromAgent, inferToolsets, detectChanges };
