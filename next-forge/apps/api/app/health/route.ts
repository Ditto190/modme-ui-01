import { createLogger } from "@repo/observability/logger";

const logger = createLogger("api.health");

export const GET = (): Response => {
  logger.info("health check", { route: "/health" });
  return new Response("OK", { status: 200 });
};
