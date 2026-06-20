
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAgentInstructions } from '../agent-instructions.js';
import { MoleculeLibrary } from '../molecule-generator.js';

describe('agent-instructions', () => {
    it('should generate instructions with molecules and constraints', () => {
        const molecules = [
            MoleculeLibrary.fileExplorer(),
            MoleculeLibrary.codeEditor()
        ];
        
        const context = {
            task: 'Refactor the authentication module',
            constraints: ['Do not delete any files', 'Use strict mode']
        };

        const instructions = generateAgentInstructions(molecules, context);

        // Verify structure
        assert.ok(instructions.includes('# Agent Instructions'));
        assert.ok(instructions.includes('## Task'));
        assert.ok(instructions.includes('Refactor the authentication module'));
        
        // Verify constraints
        assert.ok(instructions.includes('## Global Constraints'));
        assert.ok(instructions.includes('- Do not delete any files'));
        assert.ok(instructions.includes('- Use strict mode'));

        // Verify molecule summary
        assert.ok(instructions.includes('## Available Tools (Molecules)'));
        assert.ok(instructions.includes('### File Explorer (file_explorer)'));
        assert.ok(instructions.includes('### Code Editor (code_editor)'));

        // Verify detailed instructions
        assert.ok(instructions.includes('## Tool Usage Reference'));
        assert.ok(instructions.includes('# File Explorer'));
        assert.ok(instructions.includes('**ID**: `file_explorer`'));
        assert.ok(instructions.includes('# Code Editor'));
        assert.ok(instructions.includes('**ID**: `code_editor`'));
    });

    it('should handle empty constraints', () => {
        const molecules = [MoleculeLibrary.gitWorkspace()];
        const context = {
            task: 'Check git status',
            constraints: []
        };

        const instructions = generateAgentInstructions(molecules, context);
        assert.ok(!instructions.includes('## Global Constraints'));
        assert.ok(instructions.includes('# Git Workspace'));
    });
});
