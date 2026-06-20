#!/usr/bin/env node

/**
 * Generate Migration Guide
 * 
 * Creates a migration guide for deprecated toolsets.
 * Used by toolset-deprecate.yml workflow.
 * 
 * Usage:
 *   node generate-migration-guide.js --old old_name --new new_name \
 *     --reason "Reason" --output docs/migration/
 */

const fs = require('fs');
const path = require('path');

const TOOLSETS_FILE = path.join(__dirname, '../../agent/toolsets.json');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    options[key] = args[i + 1];
  }
  
  if (!options.old || !options.new) {
    throw new Error('Required: --old <old_toolset> --new <new_toolset>');
  }
  
  options.output = options.output || path.join(__dirname, '../../docs/migration');
  options.reason = options.reason || 'Toolset deprecated';
  
  return options;
}

/**
 * Load toolset definitions
 */
function loadToolsets() {
  return JSON.parse(fs.readFileSync(TOOLSETS_FILE, 'utf8'));
}

/**
 * Generate migration guide content
 */
function generateGuide(oldToolset, newToolset, reason, toolsetsData) {
  const oldDef = toolsetsData.toolsets.find(ts => ts.id === oldToolset);
  const newDef = toolsetsData.toolsets.find(ts => ts.id === newToolset);
  
  const oldTools = oldDef?.tools || [];
  const newTools = newDef?.tools || [];
  
  // Identify changes
  const removedTools = oldTools.filter(t => !newTools.includes(t));
  const addedTools = newTools.filter(t => !oldTools.includes(t));
  const commonTools = oldTools.filter(t => newTools.includes(t));
  
  const guide = `# Migration Guide: ${oldToolset} → ${newToolset}

## Overview

This guide helps you migrate from the deprecated \`${oldToolset}\` toolset to the new \`${newToolset}\` toolset.

**Reason for deprecation:** ${reason}

**Timeline:**
- **Deprecated:** ${new Date().toISOString().split('T')[0]}
- **Removal:** ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} (6 months)

## What Changed

### Tools Mapping

${commonTools.length > 0 ? `
#### Unchanged Tools
These tools work the same way in both toolsets:

${commonTools.map(tool => `- \`${tool}\``).join('\n')}
` : ''}

${addedTools.length > 0 ? `
#### New Tools
The new toolset adds these tools:

${addedTools.map(tool => `- \`${tool}\` - (Add description here)`).join('\n')}
` : ''}

${removedTools.length > 0 ? `
#### Removed Tools
These tools are no longer available:

${removedTools.map(tool => `- \`${tool}\` - Use \`(replacement)\` instead`).join('\n')}
` : ''}

## Migration Steps

### Step 1: Update Configuration

If you're explicitly enabling toolsets, update your configuration:

**Before:**
\`\`\`python
# Old way
agent.enable_toolset("${oldToolset}")
\`\`\`

**After:**
\`\`\`python
# New way
agent.enable_toolset("${newToolset}")
\`\`\`

### Step 2: Update Tool Calls

Review your code for any tool calls that may have changed.

${removedTools.length > 0 ? `
#### Replacing Removed Tools

${removedTools.map(tool => `
**\`${tool}\`** → **\`(replacement_tool)\`**

Before:
\`\`\`python
# Old usage
${tool}(args)
\`\`\`

After:
\`\`\`python
# New usage
(replacement_tool)(args)
\`\`\`
`).join('\n')}
` : ''}

### Step 3: Test Your Changes

1. Run your test suite: \`npm test\`
2. Verify all tool calls work correctly
3. Check for deprecation warnings in logs

### Step 4: Remove Legacy References

Search your codebase for any remaining references:

\`\`\`bash
# Find references to old toolset
grep -r "${oldToolset}" .
\`\`\`

## Backward Compatibility

During the deprecation period, the old toolset name will continue to work but will emit warnings:

\`\`\`
⚠️  Toolset "${oldToolset}" is deprecated. Use "${newToolset}" instead.
    Removal planned for: [DATE]
    See migration guide: docs/migration/${oldToolset}_to_${newToolset}.md
\`\`\`

## Breaking Changes

${removedTools.length > 0 ? `
⚠️ **Warning:** After the removal date, these tools will no longer be available:
${removedTools.map(tool => `- \`${tool}\``).join('\n')}

Plan your migration accordingly.
` : '_No breaking changes - this is a straightforward rename._'}

## Rollback Plan

If you encounter issues during migration:

1. Revert to using the old toolset name (works during deprecation period)
2. Report issues on GitHub
3. Review the [troubleshooting section](#troubleshooting)

## Troubleshooting

### Common Issues

**Issue: "Toolset not found" error**
- Solution: Ensure you've updated to the latest version
- Check that toolset name is spelled correctly

**Issue: Tool not working as expected**
- Solution: Review the API changes section
- Check the tool's new documentation

**Issue: Deprecation warnings flooding logs**
- Solution: Update to new toolset name to silence warnings

### Getting Help

- Open an issue: [GitHub Issues](https://github.com/your-org/your-repo/issues)
- Review documentation: [Toolset Management Guide](../TOOLSET_MANAGEMENT.md)
- Check examples: [examples/toolsets/](../../examples/toolsets/)

## Examples

### Example 1: Basic Migration

\`\`\`python
# Before
from agent import Agent

agent = Agent()
agent.enable_toolset("${oldToolset}")

# After  
from agent import Agent

agent = Agent()
agent.enable_toolset("${newToolset}")
\`\`\`

### Example 2: Tool Call Updates

\`\`\`python
# Review your specific tool calls here
# Add before/after examples based on your actual changes
\`\`\`

## Additional Resources

- [Toolset Management Documentation](../TOOLSET_MANAGEMENT.md)
- [API Reference](../API_REFERENCE.md)
- [Changelog](../../CHANGELOG.md)

## Feedback

We value your feedback! If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Contact the development team
- Submit a PR with improvements to this guide

---

**Last updated:** ${new Date().toISOString().split('T')[0]}
`;

  return guide;
}

/**
 * Main execution
 */
function main() {
  try {
    const options = parseArgs();
    
    // Load toolsets
    const toolsetsData = loadToolsets();
    
    // Generate guide content
    const guide = generateGuide(
      options.old,
      options.new,
      options.reason,
      toolsetsData
    );
    
    // Ensure output directory exists
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true });
    }
    
    // Write guide
    const filename = `${options.old}_to_${options.new}.md`;
    const filepath = path.join(options.output, filename);
    fs.writeFileSync(filepath, guide, 'utf8');
    
    console.log(`✅ Migration guide created: ${filepath}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review and customize the generated guide');
    console.log('2. Add specific examples for your use case');
    console.log('3. Update replacement tool references');
    console.log('4. Commit the guide to version control');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateGuide };
