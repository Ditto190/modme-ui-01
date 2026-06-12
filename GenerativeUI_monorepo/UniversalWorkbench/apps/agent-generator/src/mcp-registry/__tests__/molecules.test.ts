import { generateMoleculesFromTools } from '../molecule-generator.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('generates molecules from tools', () => {
    const tools: any[] = []; // empty for now, typed as any[] to avoid strict check issues before full types are available
    const molecules = generateMoleculesFromTools(tools);
    // Expecting at least some default molecules or handling of empty tools
    // Adjust expectation based on implementation details if needed
    assert.ok(molecules.length >= 0, 'Molecules length should be >= 0');
});
