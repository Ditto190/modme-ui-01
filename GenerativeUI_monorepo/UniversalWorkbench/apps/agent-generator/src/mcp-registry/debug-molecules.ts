
import { generateMoleculesFromTools } from './molecule-generator.js';
import type { MCPTool } from './registry-fetcher.js';
import fs from 'fs';

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
  {
    name: 'read_file',
    description: 'Read file',
    inputSchema: {}
  }
];

const molecules = generateMoleculesFromTools(mockTools);
const ids = molecules.map(m => m.id);
const names = molecules.map(m => m.name);

const output = {
    ids,
    names,
    customSearchMolecule: molecules.find(m => m.id === 'custom_search')
};

fs.writeFileSync('debug-output.json', JSON.stringify(output, null, 2));
console.log('Debug output written to debug-output.json');
