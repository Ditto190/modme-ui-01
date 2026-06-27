import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { devopsExpert } from "../agents/devopsExpert";

export const codebaseOrchestratorWorkflow = createWorkflowChain({
  id: "codebase-orchestrator",
  name: "Codebase Gap Orchestrator",
  purpose: "Scan the codebase, identify missing tests or lint errors, and delegate fixes to the DevOps Expert agent.",
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
      // Typically, a workflow would invoke tools directly or use an agent to do it.
      // We will simulate a direct tool call logic, or we can use the agent.
      // For this workflow, let's just pass data along to the next step, which could 
      // invoke the agent's capabilities.
      return {
        directory: data.directory,
        scanComplete: true,
      };
    },
  })
  .andThen({
    id: "delegate-fixes",
    execute: async ({ data }) => {
      // In a real VoltAgent workflow, we can invoke an agent to perform actions.
      const expert = devopsExpert;
      
      // We instruct the agent
      const response = await expert.generateText(`Please scan the directory ${data.directory} for test-coverage gaps, and apply patches to fix any missing tests you find.`);

      return {
        status: "success" as const,
        fixesApplied: 1, // Mock metric
        report: response.text,
      };
    },
  });
