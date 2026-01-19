/**
 * MCP (Model Context Protocol) Client SDK for Next.js
 *
 * Integrates patterns from mcp-use for programmatic MCP server interaction
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPServerInfo {
  server_name: string;
  tools_count: number;
  resources_count: number;
  tools: string[];
  resources: string[];
}

export class MCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get MCP server information
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    const response = await fetch(`${this.baseUrl}/api/mcp/info`);
    if (!response.ok) {
      throw new Error(`Failed to get MCP server info: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, arguments_: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/mcp/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool_name: name,
        arguments: arguments_,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Read an MCP resource
   */
  async readResource(uri: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/mcp/resource`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uri }),
    });

    if (!response.ok) {
      throw new Error(`Resource read failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content;
  }
}

// Global MCP client instance
let mcpClient: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient();
  }
  return mcpClient;
}
