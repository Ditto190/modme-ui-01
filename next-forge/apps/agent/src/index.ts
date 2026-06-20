import "dotenv/config";
import { createOpenAI } from "@ai-sdk/openai";
import {
  Agent,
  Memory,
  VoltAgent,
  VoltAgentObservability,
  VoltOpsClient,
} from "@voltagent/core";
import {
  LibSQLMemoryAdapter,
  LibSQLObservabilityAdapter,
} from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { weatherTool } from "./tools";
import { expenseApprovalWorkflow } from "./workflows";

const logger = createPinoLogger({ name: "next-forge-agent", level: "info" });

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

const observability = new VoltAgentObservability({
  storage: new LibSQLObservabilityAdapter({
    url: "file:./.voltagent/observability.db",
  }),
});

const zai = createOpenAI({
  apiKey: process.env.ZAI_API_KEY,
  baseURL: "https://api.z.ai/api/paas/v4/",
});

const agent = new Agent({
  name: "next-forge-agent",
  instructions:
    "A helpful assistant that can check weather and help with various tasks",
  model: zai("glm-4"),
  tools: [weatherTool],
  memory,
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3105;

new VoltAgent({
  agents: { agent },
  workflows: { expenseApprovalWorkflow },
  server: honoServer({ port }),
  logger,
  observability,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});

logger.info(`VoltAgent server started on port ${port}`);
