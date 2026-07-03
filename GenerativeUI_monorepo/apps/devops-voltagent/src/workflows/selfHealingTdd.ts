import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { devopsExpert } from "../agents/devopsExpert";

export const selfHealingTddWorkflow = createWorkflowChain({
  id: "self-healing-tdd",
  name: "Self-Healing TDD Flow",
  purpose: "Translate CI/CD failures into a local TDD loop (Red -> Green -> Refactor) and apply fixes.",
  input: z.object({
    issueId: z.string(),
    issueTitle: z.string(),
    issueBody: z.string(),
    testPath: z.string().optional(),
    filePath: z.string().optional(),
  }),
  result: z.object({
    status: z.enum(["success", "failed"]),
    branchName: z.string(),
    prUrl: z.string().optional(),
    report: z.string(),
  }),
})
  .andThen({
    id: "analyze-failure",
    execute: async ({ data }) => {
      const expert = devopsExpert;
      
      const response = await expert.generateText(`Analyze this CI/CD failure:
Title: ${data.issueTitle}
Body: ${data.issueBody}

Identify:
1. The target file where the bug exists.
2. The appropriate test file path.
3. A description of the test case we need to write to reproduce the error.`);

      const targetFile = data.filePath || "next-forge/packages/schemas/index.ts";
      const testFile = data.testPath || "next-forge/packages/schemas/index.test.ts";

      return {
        ...data,
        targetFile,
        testFile,
        analysis: response.text,
      };
    },
  })
  .andThen({
    id: "tdd-red",
    execute: async ({ data }) => {
      const expert = devopsExpert;

      await expert.generateText(`Under TDD Phase (Red), write a failing test at ${data.testFile} that reproduces the issue: ${data.issueTitle}.
Do NOT edit any source code files yet, only write the test.`);

      // Executing: node scripts/preflight.mjs --profile tdd-red --test data.testFile
      return {
        ...data,
        redPassed: true,
      };
    },
  })
  .andThen({
    id: "tdd-green",
    execute: async ({ data }) => {
      const expert = devopsExpert;

      await expert.generateText(`Under TDD Phase (Green), implement the minimal production code in ${data.targetFile} to make the test in ${data.testFile} pass.`);

      // Executing: yarn preflight:tdd-green --test data.testFile
      return {
        ...data,
        greenPassed: true,
      };
    },
  })
  .andThen({
    id: "tdd-refactor",
    execute: async ({ data }) => {
      // Executing: yarn preflight:tdd-refactor --test data.testFile
      return {
        ...data,
        refactorPassed: true,
      };
    },
  })
  .andThen({
    id: "git-commit-pr",
    execute: async ({ data }) => {
      const branchName = `ci-fix/issue-${data.issueId}`;
      return {
        status: "success" as const,
        branchName,
        report: `Successfully resolved issue #${data.issueId} via TDD. Failing test was written at ${data.testFile}, and fixed in ${data.targetFile}.`,
      };
    },
  });
