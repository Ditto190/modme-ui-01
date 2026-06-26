// biome-ignore lint/style/useFilenamingConvention: preserve name consistency with other systems
import { execSync } from "node:child_process";
import { createTool } from "@voltagent/core";
import { z } from "zod";

export const gitDiffTool = createTool({
  name: "getGitDiff",
  description: "Get the git diff for a specific file or list of changed files.",
  parameters: z.object({
    file: z
      .string()
      .optional()
      .describe(
        "Optional specific file path to get the diff for. If omitted, returns list of all changed files."
      ),
    baseBranch: z
      .string()
      .default("dev")
      .describe("Base branch to compare against, defaults to 'dev'"),
  }),
  // biome-ignore lint/suspicious/useAwait: VoltAgent execute signature requires async
  execute: async ({ file, baseBranch }) => {
    try {
      // Find workspace root (going up to where .git is)
      const workspaceRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf8",
      }).trim();
      if (file) {
        // Run git diff for the specific file
        const diff = execSync(`git diff ${baseBranch} -- "${file}"`, {
          encoding: "utf8",
          cwd: workspaceRoot,
        });
        return { diff };
      }
      // Run git diff --name-only to list changed files
      const files = execSync(`git diff --name-only ${baseBranch}`, {
        encoding: "utf8",
        cwd: workspaceRoot,
      })
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      return { files };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  },
});
