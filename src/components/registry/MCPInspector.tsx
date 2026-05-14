/**
 * MCP Inspector Component
 *
 * Visual inspector for FastMCP server - displays tools, resources, and prompts
 */

'use client';

import { useState, useEffect } from 'react';
import { Wrench, Database, FileText, RefreshCw, Server, CheckCircle } from 'lucide-react';

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: any;
}

interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any[];
}

interface MCPServerInfo {
  server_name: string;
  version?: string;
  tools_count: number;
  resources_count: number;
  tools: string[];
  resources: string[];
}

export function MCPInspector() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [serverInfo, setServerInfo] = useState<MCPServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

  const loadMCPData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load server info
      const infoResponse = await fetch(`${baseUrl}/api/mcp/info`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        setServerInfo(info);
      }

      // Load tools list via JSON-RPC
      const toolsResponse = await fetch(`${baseUrl}/mcp/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: crypto.randomUUID()
        })
      });

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        setTools(toolsData.result?.tools || []);
      }

      // Load resources list
      const resourcesResponse = await fetch(`${baseUrl}/mcp/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/list',
          id: crypto.randomUUID()
        })
      });

      if (resourcesResponse.ok) {
        const resourcesData = await resourcesResponse.json();
        setResources(resourcesData.result?.resources || []);
      }

      // Load prompts list
      const promptsResponse = await fetch(`${baseUrl}/mcp/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/list',
          id: crypto.randomUUID()
        })
      });

      if (promptsResponse.ok) {
        const promptsData = await promptsResponse.json();
        setPrompts(promptsData.result?.prompts || []);
      }
    } catch (err) {
      console.error('Error loading MCP data:', err);
      setError('Failed to load MCP server data. Make sure the agent is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMCPData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading MCP server data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Server className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadMCPData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Server className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                MCP Inspector
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Inspect Model Context Protocol server capabilities
            </p>
          </div>

          <button
            onClick={loadMCPData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Server Info */}
        {serverInfo && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Server Status
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Server Name</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {serverInfo.server_name}
                </p>
              </div>
              {serverInfo.version && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {serverInfo.version}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tools</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {serverInfo.tools_count}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resources</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {serverInfo.resources_count}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tools Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Tools ({tools.length})
            </h2>
          </div>

          {tools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {tool.description || 'No description available'}
                  </p>
                  {tool.inputSchema && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                        View Schema
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No tools registered
            </p>
          )}
        </section>

        {/* Resources Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Resources ({resources.length})
            </h2>
          </div>

          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <div
                  key={resource.uri}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400 mb-2 block">
                    {resource.uri}
                  </code>
                  {resource.name && (
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {resource.name}
                    </h3>
                  )}
                  {resource.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {resource.description}
                    </p>
                  )}
                  {resource.mimeType && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {resource.mimeType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No resources registered
            </p>
          )}
        </section>

        {/* Prompts Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Prompts ({prompts.length})
            </h2>
          </div>

          {prompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.map((prompt) => (
                <div
                  key={prompt.name}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {prompt.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {prompt.description || 'No description available'}
                  </p>
                  {prompt.arguments && prompt.arguments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Arguments:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                        {prompt.arguments.map((arg: any, idx: number) => (
                          <li key={idx}>
                            {arg.name}{arg.required ? ' (required)' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No prompts registered
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
