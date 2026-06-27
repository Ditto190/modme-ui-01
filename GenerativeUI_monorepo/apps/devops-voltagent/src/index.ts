import "dotenv/config";
import {
  Memory,
  VoltAgent,
  VoltAgentObservability,
  VoltOpsClient,
} from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { codebaseOrchestratorWorkflow, selfHealingTddWorkflow } from "./workflows";
import { devopsExpert } from "./agents";

const logger = createPinoLogger({ name: "devops-voltagent", level: "info" });

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

new VoltAgent({
  agents: { "devops-expert": devopsExpert },
  workflows: {
    "codebase-orchestrator": codebaseOrchestratorWorkflow,
    "self-healing-tdd": selfHealingTddWorkflow,
  },
  server: honoServer(),
  logger,
  observability,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
