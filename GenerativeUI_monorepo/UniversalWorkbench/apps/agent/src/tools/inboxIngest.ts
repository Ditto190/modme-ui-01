/**
 * @feature INBOX.ENTRY.INGEST
 * @domain INBOX
 * @layer AGENT
 * Tool: Trigger inbox ingestion via the FastAPI agent-server
 */
import { z } from 'zod';

export const InboxIngestInputSchema = z.object({
  agentServerUrl: z.string().url().default('http://localhost:8000'),
  content_hash: z.string(),
  source_file: z.string(),
  source_format: z.enum(['md', 'txt', 'pdf', 'url', 'jsx', 'snippet', 'html', 'csv']),
  raw_content: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).default([]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  entry_type: z.string().optional(),
  agent_name: z.string().optional(),
  session_id: z.string().optional(),
  branch_name: z.string().optional(),
});

export type InboxIngestInput = z.infer<typeof InboxIngestInputSchema>;

export type InboxIngestResult = {
  success: boolean;
  entry_id?: string;
  duplicate: boolean;
  error?: string;
  latency_ms: number;
};

export async function inboxIngest(input: InboxIngestInput): Promise<InboxIngestResult> {
  const start = Date.now();
  const parsed = InboxIngestInputSchema.parse(input);
  const { agentServerUrl, ...body } = parsed;

  try {
    const response = await fetch(`${agentServerUrl}/api/inbox/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        duplicate: false,
        error: `HTTP ${response.status}`,
        latency_ms: Date.now() - start,
      };
    }

    const data = (await response.json()) as { duplicate?: boolean; entry_id?: string };

    return {
      success: true,
      duplicate: data.duplicate ?? false,
      latency_ms: Date.now() - start,
      ...(data.entry_id !== undefined ? { entry_id: data.entry_id } : {}),
    };
  } catch (error) {
    return {
      success: false,
      duplicate: false,
      error: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - start,
    };
  }
}
