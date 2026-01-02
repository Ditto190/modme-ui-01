#!/usr/bin/env node

/**
 * Validate Toolsets
 * 
 * Validates toolset definitions against JSON schema and business rules.
 * Used by toolset-update.yml and toolset-validate.yml workflows.
 * 
 * Validation checks:
 * - JSON schema compliance
 * - Naming conventions (lowercase_with_underscores)
 * - Required fields present
 * - Tool references valid
 * - No duplicate IDs
 * - Reserved names not used
 * - Circular dependencies
 * 
 * Exit codes:
 * 0 - All validations passed
 * 1 - Validation failures
 * 2 - File errors
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const TOOLSETS_FILE = path.join(__dirname, '../../agent/toolsets.json');
const SCHEMA_FILE = path.join(__dirname, '../../agent/toolset-schema.json');
const AGENT_FILE = path.join(__dirname, '../../agent/main.py');

const RESERVED_NAMES = ['all', 'default', 'system', 'core', 'builtin'];
const VALID_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Load and validate against JSON schema
 * @returns {Object} Validation result
 */
function validateSchema() {
  const errors = [];
  
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    const toolsets = JSON.parse(fs.readFileSync(TOOLSETS_FILE, 'utf8'));
    
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    
    const validate = ajv.compile(schema);
    const valid = validate(toolsets);
    
    if (!valid) {
      validate.errors.forEach(error => {
        errors.push({
          type: 'schema',
          path: error.instancePath,
          message: error.message,
          params: error.params
        });
      });
    }
    
    return { valid, errors, toolsets };
    
  } catch (error) {
    return {
      valid: false,
      errors: [{
        type: 'file',
        message: `Failed to load files: ${error.message}`
      }]
    };
  }
}

/**
 * Validate naming conventions
 * @param {Object} toolsets - Toolset configuration
 * @returns {Array} Validation errors
 */
function validateNaming(toolsets) {
  const errors = [];
  
  for (const toolset of toolsets.toolsets) {
    // Check ID format
    if (!VALID_NAME_PATTERN.test(toolset.id)) {
      errors.push({
        type: 'naming',
        toolset: toolset.id,
        message: `Invalid toolset ID format. Must be lowercase_with_underscores: ${toolset.id}`
      });
    }
    
    // Check reserved names
    if (RESERVED_NAMES.includes(toolset.id)) {
      errors.push({
        type: 'naming',
        toolset: toolset.id,
        message: `Toolset ID uses reserved name: ${toolset.id}`
      });
    }
    
    // Check tool names
    for (const tool of toolset.tools) {
      if (!/^[a-z][a-zA-Z0-9_]*$/.test(tool)) {
        errors.push({
          type: 'naming',
          toolset: toolset.id,
          tool,
          message: `Invalid tool name format: ${tool}`
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate tool references exist in agent code
 * @param {Object} toolsets - Toolset configuration
 * @returns {Array} Validation errors
 */
function validateToolReferences(toolsets) {
  const errors = [];
  
  try {
    const agentCode = fs.readFileSync(AGENT_FILE, 'utf8');
    
    for (const toolset of toolsets.toolsets) {
      for (const tool of toolset.tools) {
        // Check if tool function is defined
        const pattern = new RegExp(`def\\s+${tool}\\s*\\(`);
        if (!pattern.test(agentCode)) {
          errors.push({
            type: 'reference',
            toolset: toolset.id,
            tool,
            message: `Tool ${tool} not found in agent code`
          });
        }
      }
    }
  } catch (error) {
    errors.push({
      type: 'reference',
      message: `Failed to read agent code: ${error.message}`
    });
  }
  
  return errors;
}

/**
 * Check for duplicate toolset IDs
 * @param {Object} toolsets - Toolset configuration
 * @returns {Array} Validation errors
 */
function validateUniqueness(toolsets) {
  const errors = [];
  const seen = new Set();
  
  for (const toolset of toolsets.toolsets) {
    if (seen.has(toolset.id)) {
      errors.push({
        type: 'uniqueness',
        toolset: toolset.id,
        message: `Duplicate toolset ID: ${toolset.id}`
      });
    }
    seen.add(toolset.id);
  }
  
  return errors;
}

/**
 * Validate no circular dependencies in requires
 * @param {Object} toolsets - Toolset configuration
 * @returns {Array} Validation errors
 */
function validateDependencies(toolsets) {
  const errors = [];
  const graph = {};
  
  // Build dependency graph
  for (const toolset of toolsets.toolsets) {
    graph[toolset.id] = toolset.metadata?.requires || [];
  }
  
  // Check for circular dependencies using DFS
  function hasCycle(node, visited, recursionStack) {
    visited.add(node);
    recursionStack.add(node);
    
    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        errors.push({
          type: 'dependency',
          toolset: node,
          message: `Circular dependency detected: ${node} -> ${neighbor}`
        });
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  const visited = new Set();
  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      hasCycle(node, visited, new Set());
    }
  }
  
  return errors;
}

/**
 * Format validation report
 * @param {Object} results - Validation results
 * @returns {string} Formatted report
 */
function formatReport(results) {
  const lines = [];
  
  lines.push('='.repeat(60));
  lines.push('Toolset Validation Report');
  lines.push('='.repeat(60));
  lines.push('');
  
  const totalErrors = results.schema.errors.length +
                      results.naming.length +
                      results.references.length +
                      results.uniqueness.length +
                      results.dependencies.length;
  
  if (totalErrors === 0) {
    lines.push('✅ All validations passed!');
    lines.push('');
    lines.push(`Validated ${results.toolsetCount} toolsets with ${results.toolCount} tools`);
    return lines.join('\n');
  }
  
  lines.push(`❌ Found ${totalErrors} validation errors`);
  lines.push('');
  
  // Schema errors
  if (results.schema.errors.length > 0) {
    lines.push('Schema Validation Errors:');
    results.schema.errors.forEach(err => {
      lines.push(`  - ${err.path}: ${err.message}`);
    });
    lines.push('');
  }
  
  // Naming errors
  if (results.naming.length > 0) {
    lines.push('Naming Convention Errors:');
    results.naming.forEach(err => {
      lines.push(`  - [${err.toolset}] ${err.message}`);
    });
    lines.push('');
  }
  
  // Reference errors
  if (results.references.length > 0) {
    lines.push('Tool Reference Errors:');
    results.references.forEach(err => {
      lines.push(`  - [${err.toolset}] ${err.message}`);
    });
    lines.push('');
  }
  
  // Uniqueness errors
  if (results.uniqueness.length > 0) {
    lines.push('Uniqueness Errors:');
    results.uniqueness.forEach(err => {
      lines.push(`  - ${err.message}`);
    });
    lines.push('');
  }
  
  // Dependency errors
  if (results.dependencies.length > 0) {
    lines.push('Dependency Errors:');
    results.dependencies.forEach(err => {
      lines.push(`  - [${err.toolset}] ${err.message}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  try {
    // Run all validations
    const schemaResult = validateSchema();
    
    if (!schemaResult.valid && schemaResult.errors[0]?.type === 'file') {
      console.error(formatReport({ schema: schemaResult, naming: [], references: [], uniqueness: [], dependencies: [] }));
      process.exit(2);
    }
    
    const namingErrors = validateNaming(schemaResult.toolsets);
    const referenceErrors = validateToolReferences(schemaResult.toolsets);
    const uniquenessErrors = validateUniqueness(schemaResult.toolsets);
    const dependencyErrors = validateDependencies(schemaResult.toolsets);
    
    const results = {
      schema: schemaResult,
      naming: namingErrors,
      references: referenceErrors,
      uniqueness: uniquenessErrors,
      dependencies: dependencyErrors,
      toolsetCount: schemaResult.toolsets.toolsets.length,
      toolCount: schemaResult.toolsets.toolsets.reduce((sum, ts) => sum + ts.tools.length, 0)
    };
    
    // Print report
    console.log(formatReport(results));
    
    // Exit with appropriate code
    const hasErrors = !schemaResult.valid ||
                     namingErrors.length > 0 ||
                     referenceErrors.length > 0 ||
                     uniquenessErrors.length > 0 ||
                     dependencyErrors.length > 0;
    
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateSchema,
  validateNaming,
  validateToolReferences,
  validateUniqueness,
  validateDependencies
};
