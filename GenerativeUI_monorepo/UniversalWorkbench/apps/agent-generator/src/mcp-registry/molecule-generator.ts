/**
 * molecule-generator.ts
 * 
 * Transform raw MCP tools into "Molecules" - higher-order semantic components.
 * 
 * PHILOSOPHY:
 * Don't expose read_file, write_file, list_directory directly to agents.
 * Instead, offer render_file_browser(), render_code_editor(), render_file_manager().
 * 
 * Molecules:
 * - Have clear, semantic names (intent-based, not API-based)
 * - Group related tools (filesystem operations → file management molecule)
 * - Include safety constraints and usage examples
 * - Map to GenUI components (Static/Declarative/Open-Ended)
 */

import { z } from 'zod';
import type { MCPTool, JSONSchema } from './registry-fetcher.js';

/**
 * Molecule: A semantic wrapper around one or more MCP tools
 */
export interface Molecule {
  // Identity
  id: string;                                      // "render_code_editor"
  name: string;                                    // "Code Editor"
  description: string;                             // What it does
  
  // Composition
  underlyingTools: string[];                      // ["filesystem.read", "filesystem.write"]
  
  // Interface
  parameters: z.ZodSchema;                        // What the agent passes in
  parameterSchema: Record<string, any>;           // JSON Schema representation
  
  // Semantics
  semantics: string;                              // "Allows agents to edit source files"
  suggestedUseCases: string[];                    // When to use this molecule
  constraints: string[];                          // Safety rules
  examples: MoleculeExample[];                    // Usage examples
  
  // Metadata
  tags: string[];                                 // Category tags (code, data, etc)
  genUItier: 'static' | 'declarative' | 'open-ended';  // Which GenUI layer
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface MoleculeExample {
  description: string;
  input: Record<string, any>;
  expectedOutcome: string;
}

/**
 * Molecule library: Predefined patterns for common tasks
 */
export const MoleculeLibrary = {
  // FILE MANAGEMENT
  fileExplorer: (): Molecule => ({
    id: 'file_explorer',
    name: 'File Explorer',
    description: 'Browse and navigate the file system',
    underlyingTools: ['filesystem.list_directory', 'filesystem.read_file'],
    parameters: z.object({
      path: z.string().describe('Starting directory path'),
      pattern: z.string().optional().describe('Filter files by pattern'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        pattern: { type: 'string' },
      },
      required: ['path'],
    },
    semantics: 'Navigate and explore file hierarchy',
    suggestedUseCases: [
      'Discovering project structure',
      'Finding relevant files',
      'Understanding codebase organization',
    ],
    constraints: [
      'Cannot access system directories without explicit permission',
      'Some paths may be restricted by filesystem permissions',
    ],
    examples: [
      {
        description: 'Explore project structure',
        input: { path: '/workspace', pattern: '*.ts' },
        expectedOutcome: 'List of TypeScript files in workspace',
      },
    ],
    tags: ['filesystem', 'navigation', 'exploration'],
    genUItier: 'static',
    complexity: 'simple',
  }),
  
  codeEditor: (): Molecule => ({
    id: 'code_editor',
    name: 'Code Editor',
    description: 'View, edit, and create source code files',
    underlyingTools: ['filesystem.read_file', 'filesystem.write_file'],
    parameters: z.object({
      filepath: z.string().describe('Path to file'),
      action: z.enum(['read', 'write', 'append']).describe('Operation'),
      content: z.string().optional().describe('Content for write/append'),
      language: z.string().optional().describe('Language for syntax highlighting'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        filepath: { type: 'string' },
        action: { enum: ['read', 'write', 'append'] },
        content: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['filepath', 'action'],
    },
    semantics: 'Edit source code with syntax awareness',
    suggestedUseCases: [
      'Modifying source files',
      'Creating new components',
      'Refactoring code',
      'Adding tests',
    ],
    constraints: [
      'Always confirm before overwriting files',
      'Validate syntax before committing',
      'Backup before bulk replacements',
    ],
    examples: [
      {
        description: 'Read TypeScript file',
        input: { filepath: 'src/index.ts', action: 'read', language: 'typescript' },
        expectedOutcome: 'File contents with line numbers',
      },
      {
        description: 'Edit file with confirmation',
        input: { filepath: 'src/api.ts', action: 'write', content: '// updated code' },
        expectedOutcome: 'File updated, show diff for confirmation',
      },
    ],
    tags: ['code', 'editing', 'development'],
    genUItier: 'static',
    complexity: 'moderate',
  }),
  
  fileManager: (): Molecule => ({
    id: 'file_manager',
    name: 'File Manager',
    description: 'Manage files: copy, move, delete, create directories',
    underlyingTools: [
      'filesystem.read_file',
      'filesystem.write_file',
      'filesystem.list_directory',
      'filesystem.delete_file',
      'filesystem.create_directory',
    ],
    parameters: z.object({
      action: z.enum(['copy', 'move', 'delete', 'mkdir']).describe('File operation'),
      source: z.string().describe('Source path'),
      destination: z.string().optional().describe('Destination path'),
      recursive: z.boolean().optional().describe('Recursive operation'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['copy', 'move', 'delete', 'mkdir'] },
        source: { type: 'string' },
        destination: { type: 'string' },
        recursive: { type: 'boolean' },
      },
      required: ['action', 'source'],
    },
    semantics: 'Perform file system operations with safety checks',
    suggestedUseCases: [
      'Organizing project files',
      'Refactoring directory structure',
      'Cleaning up build artifacts',
      'Creating project structure',
    ],
    constraints: [
      'Confirm all destructive operations (delete, move)',
      'Never delete without backups',
      'Preserve directory permissions',
    ],
    examples: [],
    tags: ['filesystem', 'management'],
    genUItier: 'static',
    complexity: 'moderate',
  }),
  
  // VERSION CONTROL
  gitWorkspace: (): Molecule => ({
    id: 'git_workspace',
    name: 'Git Workspace',
    description: 'View git status, diffs, branches',
    underlyingTools: [
      'git.git_status',
      'git.git_diff',
      'git.git_log',
      'git.git_branch',
    ],
    parameters: z.object({
      action: z.enum(['status', 'diff', 'log', 'branches']).describe('Git operation'),
      branch: z.string().optional().describe('Branch name'),
      lines: z.number().optional().describe('Number of log entries'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['status', 'diff', 'log', 'branches'] },
        branch: { type: 'string' },
        lines: { type: 'number' },
      },
      required: ['action'],
    },
    semantics: 'Inspect repository state without modifying',
    suggestedUseCases: [
      'Checking current branch',
      'Reviewing changes',
      'Understanding commit history',
      'Finding which branch has a fix',
    ],
    constraints: [
      'Read-only operations only',
      'Display diffs for human review',
    ],
    examples: [
      {
        description: 'Check git status',
        input: { action: 'status' },
        expectedOutcome: 'Current branch, staged/unstaged changes',
      },
    ],
    tags: ['git', 'version-control', 'inspection'],
    genUItier: 'declarative',
    complexity: 'simple',
  }),
  
  gitCommitter: (): Molecule => ({
    id: 'git_committer',
    name: 'Git Committer',
    description: 'Stage, commit, and push changes',
    underlyingTools: [
      'git.git_add',
      'git.git_commit',
      'git.git_push',
      'git.git_status',
    ],
    parameters: z.object({
      action: z.enum(['commit', 'push', 'create_branch']).describe('Action'),
      message: z.string().describe('Commit message'),
      files: z.array(z.string()).optional().describe('Files to stage'),
      branch: z.string().optional().describe('Branch name for create'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['commit', 'push', 'create_branch'] },
        message: { type: 'string' },
        files: { type: 'array', items: { type: 'string' } },
        branch: { type: 'string' },
      },
      required: ['action', 'message'],
    },
    semantics: 'Commit and push code changes',
    suggestedUseCases: [
      'Saving work with meaningful messages',
      'Creating feature branches',
      'Pushing to remote',
    ],
    constraints: [
      'Always ask for confirmation before pushing',
      'Validate commit message format',
      'Ensure tests pass before committing (if CI enabled)',
    ],
    examples: [],
    tags: ['git', 'version-control', 'collaboration'],
    genUItier: 'declarative',
    complexity: 'moderate',
  }),
  
  // ANALYSIS & REASONING
  sequentialAnalyzer: (): Molecule => ({
    id: 'sequential_analyzer',
    name: 'Sequential Analyzer',
    description: 'Break complex problems into steps and solve them methodically',
    underlyingTools: ['sequential-thinking.create_thinking_process', 'sequential-thinking.add_thinking_step'],
    parameters: z.object({
      problem: z.string().describe('Problem to analyze'),
      maxSteps: z.number().optional().describe('Maximum thinking steps'),
      approach: z.string().optional().describe('Reasoning approach'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        problem: { type: 'string' },
        maxSteps: { type: 'number' },
        approach: { type: 'string' },
      },
      required: ['problem'],
    },
    semantics: 'Decompose problems and solve step-by-step',
    suggestedUseCases: [
      'Debugging complex issues',
      'Designing large features',
      'Understanding complex code',
      'Planning refactoring',
    ],
    constraints: [
      'Keep steps focused and small',
      'Show reasoning for each step',
      'Allow for backtracking if needed',
    ],
    examples: [],
    tags: ['reasoning', 'analysis', 'planning'],
    genUItier: 'open-ended',
    complexity: 'complex',
  }),
  
  // WEB/API
  webFetcher: (): Molecule => ({
    id: 'web_fetcher',
    name: 'Web Fetcher',
    description: 'Fetch and retrieve web content',
    underlyingTools: ['web.fetch_url'],
    parameters: z.object({
      url: z.string().url().describe('URL to fetch'),
      method: z.enum(['GET', 'POST']).optional().describe('HTTP method'),
      format: z.enum(['json', 'html', 'text']).optional().describe('Expected format'),
    }),
    parameterSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        method: { enum: ['GET', 'POST'] },
        format: { enum: ['json', 'html', 'text'] },
      },
      required: ['url'],
    },
    semantics: 'Retrieve content from the web',
    suggestedUseCases: [
      'Fetching documentation',
      'Getting API responses',
      'Researching information',
    ],
    constraints: [
      'Whitelist trusted domains',
      'Sanitize external content',
      'Respect robots.txt and rate limits',
    ],
    examples: [],
    tags: ['web', 'api', 'integration'],
    genUItier: 'static',
    complexity: 'simple',
  }),
};

/**
 * Generate all molecules from registry
 */
export function generateMoleculesFromTools(tools: MCPTool[]): Molecule[] {
  const molecules: Molecule[] = [];
  
  // Start with predefined molecules
  molecules.push(...Object.values(MoleculeLibrary).map(fn => fn()));
  
  // Generate molecules from MCP tools dynamically
  tools.forEach(tool => {
    // Check if this tool is already used by an existing molecule
    // (A tool is "used" if its name appears in underlyingTools of any existing molecule)
    const isHandled = molecules.some(m => m.underlyingTools.includes(tool.name));
    
    if (!isHandled) {
      // Create a generic molecule for this tool
      molecules.push({
        id: tool.name, // Use tool name as ID
        name: tool.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
        description: tool.description,
        underlyingTools: [tool.name],
        // TODO: Implement proper runtime Zod schema generation from JSON Schema
        // For now, we use z.any() but preserve the parameterSchema for the agent to see
        parameters: z.any(),
        parameterSchema: tool.inputSchema || {},
        semantics: tool.description, // Fallback to tool description
        suggestedUseCases: ['General purpose usage'],
        constraints: ['Standard tool safety applies'],
        examples: [], // No examples for dynamic tools yet
        tags: ['dynamic', 'auto-generated'],
        genUItier: 'static',
        complexity: 'simple'
      });
    }
  });
  
  return molecules;
}

/**
 * Find molecules suitable for a task
 */
export function suggestMoleculesForTask(
  molecules: Molecule[],
  task: string
): Molecule[] {
  const taskLower = task.toLowerCase();
  
  return molecules.filter(m => {
    // Check if task mentions molecule keywords
    if (m.name.toLowerCase().includes(taskLower) ||
        m.id.includes(taskLower.replace(/\s+/g, '_'))) {
      return true;
    }
    
    // Check use cases
    return m.suggestedUseCases.some(uc =>
      uc.toLowerCase().includes(taskLower)
    );
  });
}

/**
 * Generate agent instructions for a molecule
 */
export function generateMoleculeInstructions(molecule: Molecule): string {
  return `# ${molecule.name}

**ID**: \`${molecule.id}\`

## Description
${molecule.description}

## What It Does
${molecule.semantics}

## When to Use
${molecule.suggestedUseCases.map(uc => `- ${uc}`).join('\n')}

## How to Call
\`\`\`json
{
  "molecule": "${molecule.id}",
  "parameters": ${JSON.stringify(molecule.parameterSchema, null, 2)}
}
\`\`\`

## Safety Constraints
${molecule.constraints.map(c => `- ⚠️ ${c}`).join('\n')}

## Examples
${molecule.examples.map(ex => `
### ${ex.description}
**Input**: \`${JSON.stringify(ex.input)}\`
**Expected**: ${ex.expectedOutcome}
`).join('\n')}

## Underlying Tools
These MCP tools power this molecule:
${molecule.underlyingTools.map(t => `- \`${t}\``).join('\n')}
`;
}

/**
 * Map molecule to GenUI component
 */
export function getMoleculeComponent(molecule: Molecule): string {
  switch (molecule.genUItier) {
    case 'static':
      return `components/${molecule.id}.tsx`;  // MUI component
    case 'declarative':
      return `schemas/${molecule.id}.schema.json`;  // JSON schema
    case 'open-ended':
      return `components/${molecule.id}.html`;  // Sandboxed HTML
  }
}

/**
 * Validate molecule definition
 */
export function validateMolecule(molecule: Molecule): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!molecule.id || !/^[a-z_]+$/.test(molecule.id)) {
    errors.push('Molecule ID must be lowercase with underscores only');
  }
  
  if (!molecule.underlyingTools.length) {
    errors.push('Molecule must have at least one underlying tool');
  }
  
  if (!molecule.semantics) {
    errors.push('Molecule must have a clear semantic description');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
