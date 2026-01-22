/**
 * MCP Inspector Page
 *
 * Debugging interface for FastMCP server
 */

import { MCPInspector } from '@/components/registry/MCPInspector';

export const metadata = {
  title: 'MCP Inspector | ModMe GenUI',
  description: 'Inspect Model Context Protocol server capabilities and debug agent workflows',
};

export default function InspectorPage() {
  return <MCPInspector />;
}
