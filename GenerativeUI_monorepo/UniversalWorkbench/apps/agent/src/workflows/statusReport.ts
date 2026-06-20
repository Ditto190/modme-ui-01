import { z } from 'zod';
import type { ApiHealthCheckResult } from '../tools/apiHealthCheck.js';
import { executeTool, type ToolName } from '../tools/index.js';

const StatusReportInputSchema = z.object({
  baseUrl: z.string().url().optional(),
});

export type StatusReportInput = z.infer<typeof StatusReportInputSchema>;

export type StatusReportResult = {
  service: 'api';
  status: 'healthy' | 'degraded';
  details: ApiHealthCheckResult;
};

export async function statusReportWorkflow(
  input: StatusReportInput,
  options: { tool?: ToolName } = {}
): Promise<StatusReportResult> {
  const parsed = StatusReportInputSchema.parse(input);
  const baseUrl = parsed.baseUrl ?? 'http://localhost:3000';
  const toolName: ToolName = options.tool ?? 'apiHealthCheck';

  if (toolName !== 'apiHealthCheck') {
    throw new Error(`Workflow not configured for tool '${toolName as ToolName}'`);
  }

  const details = (await executeTool(toolName, { baseUrl })) as ApiHealthCheckResult;

  return {
    service: 'api',
    status: details.status === 'ok' ? 'healthy' : 'degraded',
    details,
  };
}

export const workflows: { statusReport: typeof statusReportWorkflow } = {
  statusReport: statusReportWorkflow,
};
