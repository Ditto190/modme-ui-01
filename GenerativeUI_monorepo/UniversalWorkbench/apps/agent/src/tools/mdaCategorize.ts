/**
 * @feature INBOX.ENTRY.CATEGORIZE
 * @domain INBOX
 * @layer AGENT
 * Tool: Trigger MDA categorization pipeline via FastAPI
 */
import { z } from 'zod';

export const MdaCategorizeInputSchema = z.object({
  agentServerUrl: z.string().url().default('http://localhost:8000'),
  entry_ids: z.array(z.string()).min(1),
  mode: z.enum(['ingest', 'categorize', 'relate', 'all']).default('all'),
  dry_run: z.boolean().default(false),
});

export type MdaCategorizeInput = z.infer<typeof MdaCategorizeInputSchema>;

export type MdaCategorizeResult = {
  success: boolean;
  processed: number;
  results: Array<{
    entry_id: string;
    tags: string[];
    severity: string;
    category_id?: string;
    confidence: number;
  }>;
  errors: string[];
  duration_ms: number;
  error?: string;
};

type MdaCategorizeApiResponse = {
  duration_ms?: number;
  errors?: string[];
  processed?: number;
  results?: MdaCategorizeResult['results'];
};

export async function mdaCategorize(input: MdaCategorizeInput): Promise<MdaCategorizeResult> {
  const start = Date.now();
  const parsed = MdaCategorizeInputSchema.parse(input);
  const { agentServerUrl, ...body } = parsed;

  try {
    const response = await fetch(`${agentServerUrl}/api/inbox/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        processed: 0,
        results: [],
        errors: [`HTTP ${response.status}`],
        duration_ms: Date.now() - start,
      };
    }

    const data = (await response.json()) as MdaCategorizeApiResponse;

    return {
      success: true,
      processed: data.processed ?? 0,
      results: data.results ?? [],
      errors: data.errors ?? [],
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      processed: 0,
      results: [],
      errors: [message],
      error: message,
      duration_ms: Date.now() - start,
    };
  }
}
