import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { devopsExpert } from "../agents/devopsExpert";

export const codebaseOrchestratorWorkflow = createWorkflowChain({
  id: "codebase-orchestrator",
  name: "Codebase Gap Orchestrator",
  purpose:
    "Scan the codebase, identify missing tests or lint errors, and delegate fixes to the DevOps Expert agent.",
  input: z.object({
    directory: z.string(),
  }),
  result: z.object({
    status: z.enum(["success", "failed"]),
    fixesApplied: z.number(),
    report: z.string(),
  }),
})
  .andThen({
    id: "scan-codebase",
    execute: async ({ data }) => {
      return {
        directory: data.directory,
        scanComplete: true,
      };
    },
  })
  .andThen({
    id: "delegate-fixes",
    execute: async ({ data }) => {
      const expert = devopsExpert;
      const response = await expert.generateText(
        `Please scan the directory ${data.directory} for test-coverage gaps, and apply patches to fix any missing tests you find.`
      );

      return {
        status: "success" as const,
        fixesApplied: 1,
        report: response.text,
      };
    },
  });
