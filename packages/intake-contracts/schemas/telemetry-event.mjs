import { z } from 'zod';
import { AGENT_ROLES, SEVERITIES } from './classify-output.mjs';

export const TELEMETRY_LEVELS = ['debug', 'info', 'warn', 'error'];

export const telemetryEventSchema = z.object({
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  message: z.string().min(1),
  source: z.string().min(1),
  level: z.enum(TELEMETRY_LEVELS).default('info'),
  severity: z.enum(SEVERITIES).optional(),
  agent_role: z.enum(AGENT_ROLES).optional(),
  metadata: z.record(z.unknown()).default({}),
  content_hash: z.string().length(64).optional(),
});

export const telemetryEventBatchSchema = z.array(telemetryEventSchema);
