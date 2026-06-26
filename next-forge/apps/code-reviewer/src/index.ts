import "dotenv/config";
import {
  VoltAgent,
  VoltAgentObservability,
  VoltOpsClient,
} from "@voltagent/core";
import { LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { reviewer } from "./agents/reviewer";
import { codebaseReviewWorkflow } from "./workflows";

const logger = createPinoLogger({ name: "code-reviewer-agent", level: "info" });

const observability = new VoltAgentObservability({
  storage: new LibSQLObservabilityAdapter({
    url: "file:./.voltagent/observability.db",
  }),
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3106;

new VoltAgent({
  agents: { reviewer },
  workflows: { codebaseReviewWorkflow },
  server: honoServer({ port }),
  logger,
  observability,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});

logger.info(`Code Reviewer VoltAgent server started on port ${port}`);
