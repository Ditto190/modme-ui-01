import { google } from "@ai-sdk/google";
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { fileContextTool } from "../tools";

const logger = createPinoLogger({ name: "code-reviewer-agent", level: "info" });

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

export const reviewer = new Agent({
  name: "reviewer",
  // biome-ignore lint/suspicious/noExplicitAny: VoltAgent core accepts any model type
  model: google("gemini-2.0-flash") as any,
  tools: [fileContextTool],
  memory,
});
