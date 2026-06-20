
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { generateAgentInstructions } from '../agent-instructions.js';
import { generateMoleculesFromTools } from '../molecule-generator.js';
import type { MCPTool } from '../registry-fetcher.js';

describe('MCP Indexer Integration', () => {
  it('should process a raw server spec -> molecules -> agent instructions', () => {
    // 1. Mock Raw Tools (as if from registry-fetcher)
    const mockTools: MCPTool[] = [
      {
        name: 'custom_search',
        description: 'Search the custom database',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      },
      // Include a tool that IS in the library to verify dedup/handling
      {
        name: 'read_file',
        description: 'Read file',
        inputSchema: {}
      }
    ];

    // 2. Generate Molecules
    const molecules = generateMoleculesFromTools(mockTools);
    
    const customMolecule = molecules.find(m => m.id === 'custom_search');
    assert.ok(customMolecule, 'Dynamic molecule should be created for custom_search');
    assert.strictEqual(customMolecule?.name, 'Custom Search');

    // 3. Generate Instructions
    const context = {
        task: 'Find data',
        constraints: []
    };
    const instructions = generateAgentInstructions(molecules, context);
    
    // Write debug output to file to avoid console truncation
    const debugOutput = {
        molecules: molecules.map(m => ({ id: m.id, name: m.name, underlyingTools: m.underlyingTools })),
        instructionsPrefix: instructions.substring(0, 500),
        instructionsContainsCustom: instructions.includes('Custom Search'),
        instructionsContainsFileExplorer: instructions.includes('File Explorer'),
        fullInstructions: instructions
    };
    
    fs.writeFileSync('debug-test-output.json', JSON.stringify(debugOutput, null, 2));

    // 4. Assertions
    assert.ok(instructions.includes('Custom Search (custom_search)'), 'Instructions should list custom tool');
    assert.ok(instructions.includes('"query": { "type": "string" }'), 'Instructions should include schema params');
    
    // Check for library molecule too
    assert.ok(instructions.includes('File Explorer'), 'Instructions should include library molecules');
  });
});
