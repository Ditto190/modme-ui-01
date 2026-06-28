import { z } from 'zod';
import { SEVERITIES } from './classify-output.mjs';

export const TEST_FRAMEWORKS = ['playwright', 'junit', 'vitest', 'other'];

export const testResultSchema = z.object({
  tenant_id: z.string().uuid(),
  contract_name: z.string().min(1),
  rule_id: z.string().min(1),
  passed: z.boolean(),
  severity: z.enum(SEVERITIES),
  framework: z.enum(TEST_FRAMEWORKS).default('other'),
  evidence: z.record(z.unknown()).default({}),
});
