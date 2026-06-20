#!/usr/bin/env node

/**
 * Create Deprecation Alias
 * 
 * Creates an alias mapping from an old toolset to a new one.
 * Used by toolset-deprecate.yml workflow.
 * 
 * Usage:
 *   node create-alias.js --old old_name --new new_name \
 *     --reason "Migration reason" --removal-date 2026-07-01
 * 
 * Updates:
 * - agent/toolset_aliases.json (adds alias mapping)
 * - Includes metadata: deprecated_at, removal_date, reason
 */

const fs = require('fs');
const path = require('path');

const ALIASES_FILE = path.join(__dirname, '../../agent/toolset_aliases.json');
const TOOLSETS_FILE = path.join(__dirname, '../../agent/toolsets.json');

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    options[key] = args[i + 1];
  }
  
  // Validate required arguments
  if (!options.old || !options.new) {
    throw new Error('Required arguments: --old <old_toolset> --new <new_toolset>');
  }
  
  // Default values
  options.reason = options.reason || 'Toolset deprecated';
  options['removal-date'] = options['removal-date'] || calculateRemovalDate(180);
  
  return options;
}

/**
 * Calculate removal date from now + days
 * @param {number} days - Days until removal
 * @returns {string} ISO date string
 */
function calculateRemovalDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Validate toolsets exist
 * @param {string} oldToolset - Old toolset ID
 * @param {string} newToolset - New toolset ID
 * @returns {Object} Validation result
 */
function validateToolsets(oldToolset, newToolset) {
  const errors = [];
  
  try {
    const toolsets = JSON.parse(fs.readFileSync(TOOLSETS_FILE, 'utf8'));
    const ids = toolsets.toolsets.map(ts => ts.id);
    
    // Check old toolset exists or is already deprecated
    const aliases = loadAliases();
    if (!ids.includes(oldToolset) && !aliases.aliases[oldToolset]) {
      errors.push(`Old toolset not found: ${oldToolset}`);
    }
    
    // Check new toolset exists
    if (!ids.includes(newToolset)) {
      errors.push(`New toolset not found: ${newToolset}`);
    }
    
    // Check not already aliased
    if (aliases.aliases[oldToolset]) {
      errors.push(`Toolset ${oldToolset} is already aliased to ${aliases.aliases[oldToolset]}`);
    }
    
  } catch (error) {
    errors.push(`Failed to load toolsets: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load existing aliases
 * @returns {Object} Aliases configuration
 */
function loadAliases() {
  try {
    if (!fs.existsSync(ALIASES_FILE)) {
      return {
        version: '1.0.0',
        updated: new Date().toISOString(),
        aliases: {},
        deprecation_metadata: {}
      };
    }
    return JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8'));
  } catch (error) {
    console.error(`Warning: Failed to load aliases: ${error.message}`);
    return {
      version: '1.0.0',
      updated: new Date().toISOString(),
      aliases: {},
      deprecation_metadata: {}
    };
  }
}

/**
 * Create alias mapping
 * @param {Object} options - Alias options
 * @returns {Object} Updated aliases configuration
 */
function createAlias(options) {
  const aliases = loadAliases();
  
  // Add alias mapping
  aliases.aliases[options.old] = options.new;
  
  // Add metadata
  aliases.deprecation_metadata[options.old] = {
    deprecated_at: new Date().toISOString(),
    removal_date: options['removal-date'],
    reason: options.reason,
    replacement: options.new,
    migration_guide: `docs/migration/${options.old}_to_${options.new}.md`
  };
  
  // Update timestamp
  aliases.updated = new Date().toISOString();
  
  return aliases;
}

/**
 * Save aliases to file
 * @param {Object} aliases - Aliases configuration
 */
function saveAliases(aliases) {
  const json = JSON.stringify(aliases, null, 2) + '\n';
  fs.writeFileSync(ALIASES_FILE, json, 'utf8');
}

/**
 * Format success message
 * @param {Object} options - Alias options
 * @returns {string} Formatted message
 */
function formatSuccessMessage(options) {
  return `
✅ Deprecation alias created successfully!

Old toolset: ${options.old}
New toolset: ${options.new}
Reason:      ${options.reason}
Deprecated:  ${new Date().toISOString().split('T')[0]}
Removal:     ${options['removal-date']}

The alias mapping has been added to ${ALIASES_FILE}

Users can continue using '${options.old}' which will resolve to '${options.new}'
with a deprecation warning.

Next steps:
1. Generate migration guide: docs/migration/${options.old}_to_${options.new}.md
2. Update documentation
3. Create tracking issue (optional)
4. Announce deprecation to users
`;
}

/**
 * Main execution
 */
function main() {
  try {
    // Parse arguments
    const options = parseArgs();
    
    console.log(`Creating deprecation alias: ${options.old} -> ${options.new}`);
    
    // Validate toolsets
    const validation = validateToolsets(options.old, options.new);
    if (!validation.valid) {
      console.error('\n❌ Validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
    
    // Create alias
    const aliases = createAlias(options);
    
    // Save to file
    saveAliases(aliases);
    
    // Print success message
    console.log(formatSuccessMessage(options));
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { createAlias, validateToolsets, calculateRemovalDate };
