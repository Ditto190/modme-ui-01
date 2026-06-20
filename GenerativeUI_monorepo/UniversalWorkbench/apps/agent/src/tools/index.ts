import type { z } from 'zod';
import {
  ApiHealthCheckInputSchema,
  type ApiHealthCheckResult,
  apiHealthCheck,
} from './apiHealthCheck.js';
import {
  InboxIngestInputSchema,
  type InboxIngestResult,
  inboxIngest,
} from './inboxIngest.js';
import {
  MdaCategorizeInputSchema,
  type MdaCategorizeResult,
  mdaCategorize,
} from './mdaCategorize.js';

export interface ToolDefinition<TSchema extends z.ZodTypeAny, TResult> {
  name: string;
  description: string;
  schema: TSchema;
  execute(input: z.output<TSchema>): Promise<TResult> | TResult;
}

const apiHealthCheckTool: ToolDefinition<typeof ApiHealthCheckInputSchema, ApiHealthCheckResult> = {
  name: 'api_health_check',
  description: 'Checks the API /health endpoint and returns timing + payload information.',
  schema: ApiHealthCheckInputSchema,
  execute: apiHealthCheck,
};

const inboxIngestTool: ToolDefinition<typeof InboxIngestInputSchema, InboxIngestResult> = {
  name: 'inbox_ingest',
  description: 'Triggers inbox ingestion via the FastAPI agent-server.',
  schema: InboxIngestInputSchema,
  execute: inboxIngest,
};

const mdaCategorizeTool: ToolDefinition<typeof MdaCategorizeInputSchema, MdaCategorizeResult> = {
  name: 'mda_categorize',
  description: 'Triggers inbox categorization via the FastAPI agent-server.',
  schema: MdaCategorizeInputSchema,
  execute: mdaCategorize,
};

export const tools = {
  apiHealthCheck: apiHealthCheckTool,
  inboxIngest: inboxIngestTool,
  mdaCategorize: mdaCategorizeTool,
};

export type ToolRegistry = typeof tools;
export type ToolName = keyof ToolRegistry;

export function listTools(): Array<{ name: string; description: string }> {
  return Object.values(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));
}

export async function executeTool<TName extends ToolName>(
  name: TName,
  input: unknown
): Promise<Awaited<ReturnType<ToolRegistry[TName]['execute']>>> {
  const tool = tools[name];

  if (tool === undefined) {
    throw new Error(`Tool '${String(name)}' is not registered`);
  }

  const parsed = tool.schema.parse(input ?? {});

  const result = await (tool.execute as (validatedInput: unknown) => unknown)(parsed);
  return result as Awaited<ReturnType<ToolRegistry[TName]['execute']>>;
}
