// biome-ignore lint/style/useFilenamingConvention: preserve name consistency with other systems
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTool } from "@voltagent/core";
import { z } from "zod";

export const fileContextTool = createTool({
  name: "getFileContext",
  description:
    "Read the full contents of a file to provide context for reviews.",
  parameters: z.object({
    file: z
      .string()
      .describe("The file path to read (relative to workspace root)."),
  }),
  // biome-ignore lint/suspicious/useAwait: VoltAgent execute signature requires async
  execute: async ({ file }) => {
    try {
      const workspaceRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf8",
      }).trim();
      const fullPath = join(workspaceRoot, file);
      const content = readFileSync(fullPath, "utf8");
      return { content };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  },
});
