import { z } from 'zod';
import { SEVERITIES } from './classify-output.mjs';

export const EVAL_IMPACT_LEVELS = ['low', 'medium', 'high'];

export const evalSignalSchema = z.object({
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  theme_id: z.string().nullable().optional(),
  source: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  impact: z.enum(EVAL_IMPACT_LEVELS).default('medium'),
  severity: z.enum(SEVERITIES).optional(),
  evidence: z.record(z.unknown()).default({}),
});
