// biome-ignore lint/style/useFilenamingConvention: preserve name consistency with other systems
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { reviewer } from "../agents/reviewer";
import { gitDiffTool } from "../tools/gitDiff";

interface GitDiffResult {
  diff?: string;
  error?: string;
  files?: string[];
}

export const codebaseReviewWorkflow = createWorkflowChain({
  id: "codebase-review",
  name: "Codebase Review Workflow",
  purpose:
    "Analyzes all changed files on the current branch compared to a base branch, producing a consolidated review report.",
  input: z.object({
    baseBranch: z.string().default("dev"),
  }),
  result: z.object({
    reviewReport: z.string(),
    reviewedFiles: z.array(z.string()),
  }),
})
  .andThen({
    id: "discover-changes",
    execute: async ({ data }) => {
      // Execute gitDiffTool directly
      const result = await gitDiffTool.execute?.({
        baseBranch: data.baseBranch,
      });
      const files = (result as GitDiffResult).files || [];
      const skipPatterns = [
        "yarn.lock",
        "bun.lockb",
        "package-lock.json",
        "dist/",
        "node_modules/",
        ".png",
        ".jpg",
        ".jpeg",
        ".ico",
      ];
      const filteredFiles = files.filter(
        (f: string) => !skipPatterns.some((p) => f.includes(p))
      );
      return {
        ...data,
        filesToReview: filteredFiles,
      };
    },
  })
  .andThen({
    id: "generate-reviews",
    execute: async ({ data }) => {
      const files = data.filesToReview || [];
      const reviews: string[] = [];

      for (const file of files) {
        // Execute gitDiffTool directly
        const diffResult = await gitDiffTool.execute?.({
          file,
          baseBranch: data.baseBranch,
        });
        const diff = (diffResult as GitDiffResult).diff || "";

        if (!diff.trim()) {
          continue;
        }

        const reviewPrompt = `You are an expert software engineer and code reviewer.
Your job is to review code diffs and provide high-quality, professional code reviews.
Be concise and clear. Focus on:
1. Logic bugs or edge cases.
2. Security concerns (e.g. data leak, validation).
3. Monorepo architectural boundaries and styling conventions.
4. Clean code practices.

Please review the following git diff for file "${file}":

\`\`\`diff
${diff}
\`\`\``;

        // Execute reviewer Agent directly via generateText
        const response = await reviewer.generateText([
          { role: "user", content: reviewPrompt },
        ]);
        const review = response.text;
        reviews.push(`### Review for \`${file}\`\n\n${review}`);
      }

      const consolidatedReport =
        reviews.length > 0
          ? reviews.join("\n\n---\n\n")
          : "No significant changes to review or all changes were skipped.";

      return {
        reviewReport: consolidatedReport,
        reviewedFiles: files,
      };
    },
  });
