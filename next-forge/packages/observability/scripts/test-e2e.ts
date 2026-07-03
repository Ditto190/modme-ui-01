// @ts-expect-error
import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @ts-expect-error
mock.module("server-only", () => {
  return {};
});

// Load environment variables from database/.env
try {
  const envPath = resolve(import.meta.dirname, "../../database/.env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env", e);
}

async function main() {
  const { createLogger } = await import("../src/logger");
  const { telemetryBatcher } = await import("../src/ingest/telemetry-ingestor");
  const { database } = await import("@repo/database");

  const logger = createLogger("e2e-test");
  const testMessage = `Test message ${Date.now()}`;

  logger.info(testMessage, { testId: "123" });
  logger.warn(`Warn: ${testMessage}`, { testId: "123" });
  logger.error(new Error(`Error: ${testMessage}`), { testId: "123" });

  // Flush the batcher
  await telemetryBatcher.flush();

  // Query Prisma
  const event = await database.telemetryEvent.findFirst({
    where: { message: testMessage },
  });

  if (event) {
    console.log("E2E test passed: Event found in database.");
    process.exit(0);
  } else {
    console.error("E2E test failed: Event not found in database.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
