import { z } from 'zod';

/** Synced from docs/inbox-pipeline/contracts/inbox-contract.v1.json + scrape-schemas */
export const ENTRY_TYPES = [
  'architecture',
  'design',
  'code-review',
  'solution',
  'research',
  'snippet',
  'link',
  'component',
];

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const AGENT_ROLES = [
  'frontend',
  'backend',
  'devops',
  'architect',
  'reviewer',
  'researcher',
];

/** Ollama / classifier output before scrape_classifications insert */
export const classifyOutputSchema = z.object({
  entry_type: z.enum(ENTRY_TYPES),
  severity: z.enum(SEVERITIES),
  agent_role: z.enum(AGENT_ROLES),
  title: z.string().min(1).max(500),
  summary: z.string().max(300),
  tags: z.array(z.string()).max(8).default([]),
  features: z.record(z.unknown()).default({}),
});
