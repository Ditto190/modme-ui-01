/**
 * Example: Integration with Agent Workflow
 *
 * Shows how to use ofetch with the Python ADK agent
 */

import { $api } from "@/utils/fetch";

// Type definitions for agent tools
export interface UIElement {
  id: string;
  type: "StatCard" | "DataTable" | "ChartCard";
  props: Record<string, any>;
}

export interface AgentToolCall {
  tool: string;
  params: Record<string, any>;
}

export interface AgentResponse {
  status: "success" | "error";
  message: string;
  data?: any;
}

// Create configured agent client
export const $agent = $api.create({
  baseURL: "http://localhost:8000",
  timeout: 60000,

  onRequest({ options }) {
    console.log("[Agent] Calling tool:", options.body);
  },

  onResponse({ response }) {
    if (response._data?.status === "error") {
      console.error("[Agent] Error:", response._data.message);
    }
  },
});

/**
 * Call agent tool with type safety
 */
export async function callAgentTool<T = any>(
  tool: string,
  params: Record<string, any>
): Promise<AgentResponse & { data?: T }> {
  return $agent<AgentResponse>("/", {
    method: "POST",
    body: { tool, params },
  });
}

/**
 * UI Element Management
 */
export async function upsertUIElement(
  id: string,
  type: UIElement["type"],
  props: Record<string, any>
): Promise<AgentResponse> {
  return callAgentTool("upsert_ui_element", { id, type, props });
}

export async function removeUIElement(id: string): Promise<AgentResponse> {
  return callAgentTool("remove_ui_element", { id });
}

export async function clearCanvas(): Promise<AgentResponse> {
  return callAgentTool("clear_canvas", {});
}

/**
 * Theme Management
 */
export async function setThemeColor(color: string): Promise<AgentResponse> {
  return callAgentTool("setThemeColor", { themeColor: color });
}

/**
 * Journal Operations (from MCP server)
 */
export interface JournalEntry {
  id: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function addJournalEntry(
  content: string,
  metadata?: Record<string, any>
): Promise<AgentResponse & { data: JournalEntry }> {
  return callAgentTool("journal_add", { content, metadata });
}

export async function listJournalEntries(
  limit?: number
): Promise<AgentResponse & { data: JournalEntry[] }> {
  return callAgentTool("journal_list", { limit });
}

export async function searchJournalEntries(
  query: string,
  limit?: number
): Promise<AgentResponse & { data: JournalEntry[] }> {
  return callAgentTool("journal_search", { query, limit });
}

/**
 * Example: React Hook for Agent Operations
 */
export function useAgentTool<T = any>(tool: string) {
  return async (params: Record<string, any>) => {
    try {
      const response = await callAgentTool<T>(tool, params);

      if (response.status === "error") {
        throw new Error(response.message);
      }

      return response.data;
    } catch (error) {
      console.error(`[Agent] Tool ${tool} failed:`, error);
      throw error;
    }
  };
}

/**
 * Example: Batch Operations
 */
export async function batchUIOperations(
  operations: Array<{
    tool: string;
    params: Record<string, any>;
  }>
): Promise<AgentResponse[]> {
  return Promise.all(
    operations.map(({ tool, params }) => callAgentTool(tool, params))
  );
}

/**
 * Example: Create Dashboard with Multiple Elements
 */
export async function createDashboard(elements: UIElement[]): Promise<void> {
  await clearCanvas();

  await batchUIOperations(
    elements.map((el) => ({
      tool: "upsert_ui_element",
      params: { id: el.id, type: el.type, props: el.props },
    }))
  );
}

/**
 * Example: Usage in React Component
 */
/*
import { useAgentTool, upsertUIElement } from '@/utils/agent-integration';

function MyComponent() {
  const addElement = useAgentTool('upsert_ui_element');
  
  const handleClick = async () => {
    await addElement({
      id: 'revenue_stat',
      type: 'StatCard',
      props: { title: 'Revenue', value: 120000 }
    });
    
    // Or use helper directly
    await upsertUIElement('revenue_stat', 'StatCard', {
      title: 'Revenue',
      value: 120000
    });
  };
  
  return <button onClick={handleClick}>Add Stat Card</button>;
}
*/
