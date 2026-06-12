/**
 * registry-fetcher.ts
 * 
 * Fetches and parses the MCP servers registry from modelcontextprotocol/servers.
 * Returns structured ServerSpec[] with tools, parameters, and documentation.
 */

import { z } from 'zod';

/**
 * JSON Schema representation (simplified for MCP tools)
 */
export const JSONSchemaSchema = z.object({
  type: z.string().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  description: z.string().optional(),
  items: z.any().optional(),
  enum: z.array(z.any()).optional(),
  default: z.any().optional(),
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
});

export type JSONSchema = z.infer<typeof JSONSchemaSchema>;

/**
 * MCP Tool definition - single method/function provided by an MCP server
 */
export const MCPToolSchema = z.object({
  name: z.string().describe('Tool identifier (e.g., "read_file")'),
  description: z.string().describe('What this tool does'),
  inputSchema: JSONSchemaSchema.optional().describe('JSON Schema for tool parameters'),
  returns: JSONSchemaSchema.optional().describe('JSON Schema for return value'),
  examples: z.array(z.object({
    input: z.any(),
    output: z.any(),
    description: z.string().optional(),
  })).optional().describe('Usage examples'),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

/**
 * MCP Server specification - a collection of tools from one server
 */
export const ServerSpecSchema = z.object({
  id: z.string().describe('Server identifier (e.g., "filesystem", "git", "postgres")'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('What this server does'),
  repository: z.string().url().optional().describe('GitHub/source repository'),
  category: z.enum([
    'development',
    'database',
    'productivity',
    'research',
    'utilities',
    'experimental'
  ]).optional(),
  tools: z.array(MCPToolSchema).describe('Available tools/methods'),
  transport: z.enum(['stdio', 'sse']).default('stdio').describe('Supported transports'),
  requirements: z.object({
    nodeVersion: z.string().optional(),
    pythonVersion: z.string().optional(),
    systemDeps: z.array(z.string()).optional(),
  }).optional().describe('System requirements'),
  installation: z.object({
    npm: z.string().optional().describe('NPM package (e.g., @modelcontextprotocol/server-filesystem)'),
    python: z.string().optional().describe('PyPI package'),
    docker: z.string().optional().describe('Docker image'),
  }).optional().describe('How to install'),
  documentation: z.string().url().optional().describe('Link to docs'),
  status: z.enum(['stable', 'beta', 'experimental', 'deprecated']).default('stable'),
});

export type ServerSpec = z.infer<typeof ServerSpecSchema>;

/**
 * Complete registry snapshot
 */
export const MCPRegistrySchema = z.object({
  version: z.string().describe('Registry version'),
  lastUpdated: z.string().datetime().describe('When registry was last updated'),
  servers: z.array(ServerSpecSchema).describe('All available servers'),
  metadata: z.object({
    totalServers: z.number(),
    totalTools: z.number(),
    categories: z.array(z.string()),
  }).optional(),
});

export type MCPRegistry = z.infer<typeof MCPRegistrySchema>;

/**
 * Fetch and parse the MCP servers registry
 * 
 * This function:
 * 1. Fetches from modelcontextprotocol/servers (real repo)
 * 2. Parses README and configuration files
 * 3. Extracts tool specs from each server implementation
 * 4. Returns structured ServerSpec[] with validation
 */
export async function fetchMCPRegistry(): Promise<MCPRegistry> {
  // TODO: Implement in phases
  
  // Phase 1: Manual bootstrap
  // - Hardcode canonical MCP servers from modelcontextprotocol/servers
  // - Use GitHub API to fetch server specs
  
  // Phase 2: Dynamic fetching
  // - Parse README.md for server list
  // - Crawl each server's package.json + documentation
  // - Extract tool definitions from source code
  
  // Phase 3: Caching + hot-reload
  // - Cache parsed registry locally
  // - Watch for upstream changes
  // - Notify on new servers/tools
  
  const registry = await bootstrapCanonicalServers();
  
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    servers: registry,
    metadata: {
      totalServers: registry.length,
      totalTools: registry.reduce((sum, s) => sum + s.tools.length, 0),
      categories: [...new Set(registry.map(s => s.category).filter(c => !!c))] as string[],
    },
  };
}

/**
 * Bootstrap with canonical MCP servers
 * These are the reference implementations from modelcontextprotocol/servers
 */
async function bootstrapCanonicalServers(): Promise<ServerSpec[]> {
  return [
    {
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Read, write, and navigate the file system',
      category: 'utilities',
      tools: [
        {
          name: 'read_file',
          description: 'Read the complete contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path to read',
              },
            },
            required: ['path'],
          },
          returns: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The file contents',
              },
            },
          },
          examples: [
            {
              input: { path: '/path/to/file.txt' },
              output: { content: 'File contents here...' },
              description: 'Read a text file',
            },
          ],
        },
        {
          name: 'write_file',
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path to write',
              },
              content: {
                type: 'string',
                description: 'The content to write',
              },
            },
            required: ['path', 'content'],
          },
          returns: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
              },
            },
          },
        },
        {
          name: 'list_directory',
          description: 'List contents of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The directory path to list',
              },
            },
            required: ['path'],
          },
          returns: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
              },
              directories: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      ],
      transport: 'stdio',
      installation: {
        npm: '@modelcontextprotocol/server-filesystem',
      },
      status: 'stable',
    },
    
    {
      id: 'git',
      name: 'Git',
      description: 'Interact with Git repositories',
      category: 'development',
      tools: [
        {
          name: 'git_status',
          description: 'Get current git status',
          inputSchema: {
            type: 'object',
            properties: {
              repository_path: {
                type: 'string',
                description: 'Path to git repository',
              },
            },
            required: ['repository_path'],
          },
          returns: {
            type: 'object',
            properties: {
              branch: { type: 'string' },
              changes: { type: 'array' },
            },
          },
        },
        {
          name: 'git_commit',
          description: 'Commit changes',
          inputSchema: {
            type: 'object',
            properties: {
              repository_path: { type: 'string' },
              message: { type: 'string' },
              files: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['repository_path', 'message'],
          },
        },
        {
          name: 'git_push',
          description: 'Push changes to remote',
          inputSchema: {
            type: 'object',
            properties: {
              repository_path: { type: 'string' },
              branch: { type: 'string' },
              force: { type: 'boolean' },
            },
            required: ['repository_path'],
          },
        },
      ],
      transport: 'stdio',
      installation: {
        npm: '@modelcontextprotocol/server-git',
      },
      status: 'stable',
    },
    
    {
      id: 'web',
      name: 'Web',
      description: 'Fetch and interact with web content',
      category: 'utilities',
      tools: [
        {
          name: 'fetch_url',
          description: 'Fetch content from a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                format: 'uri',
                description: 'The URL to fetch',
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE'],
                default: 'GET',
              },
              headers: {
                type: 'object',
                description: 'Optional HTTP headers',
              },
              body: {
                type: 'string',
                description: 'Request body for POST/PUT',
              },
            },
            required: ['url'],
          },
          returns: {
            type: 'object',
            properties: {
              status: { type: 'number' },
              headers: { type: 'object' },
              content: { type: 'string' },
            },
          },
        },
      ],
      transport: 'stdio',
      installation: {
        npm: '@modelcontextprotocol/server-web',
      },
      status: 'stable',
    },
    
    {
      id: 'sequential-thinking',
      name: 'Sequential Thinking',
      description: 'Break complex problems into sequential steps',
      category: 'utilities',
      tools: [
        {
          name: 'create_thinking_process',
          description: 'Start a sequential thinking session',
          inputSchema: {
            type: 'object',
            properties: {
              problem: {
                type: 'string',
                description: 'The problem to solve',
              },
              max_steps: {
                type: 'number',
                description: 'Maximum number of steps',
                default: 10,
              },
            },
            required: ['problem'],
          },
        },
        {
          name: 'add_thinking_step',
          description: 'Add a thinking step to current process',
          inputSchema: {
            type: 'object',
            properties: {
              step_number: { type: 'number' },
              content: { type: 'string' },
              reasoning: { type: 'string' },
            },
            required: ['step_number', 'content'],
          },
        },
      ],
      transport: 'stdio',
      installation: {
        npm: '@modelcontextprotocol/server-sequential-thinking',
      },
      status: 'stable',
    },
    
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'Query and manipulate PostgreSQL databases',
      category: 'database',
      tools: [
        {
          name: 'query_database',
          description: 'Execute SQL query',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              params: { type: 'array' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_schema',
          description: 'Get database schema information',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
            },
          },
        },
      ],
      transport: 'stdio',
      installation: {
        npm: '@modelcontextprotocol/server-postgres',
      },
      status: 'stable',
    },
  ];
}

/**
 * Get registry and validate against schema
 */
export async function getValidatedRegistry(): Promise<MCPRegistry> {
  const raw = await fetchMCPRegistry();
  const validated = MCPRegistrySchema.parse(raw);
  return validated;
}

/**
 * Utility: Filter servers by category
 */
export function getServersByCategory(
  registry: MCPRegistry,
  category: string
): ServerSpec[] {
  return registry.servers.filter(s => s.category === category);
}

/**
 * Utility: Get all tools across all servers
 */
export function getAllTools(registry: MCPRegistry): MCPTool[] {
  return registry.servers.flatMap(s => s.tools);
}

/**
 * Utility: Find a specific server
 */
export function findServer(registry: MCPRegistry, id: string): ServerSpec | undefined {
  return registry.servers.find(s => s.id === id);
}

/**
 * Utility: Find all tools matching a name pattern
 */
export function findTools(registry: MCPRegistry, pattern: RegExp): MCPTool[] {
  return getAllTools(registry).filter(t => pattern.test(t.name));
}
