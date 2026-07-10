import { parseError } from "../error";
import { log as baseLog } from "../log";
import { categorizeLog } from "./categorize/telemetry-categorizer";
import {
  DEFAULT_DEV_TENANT_ID,
  ingestTelemetry,
} from "./ingest/telemetry-ingestor";

export class Logger {
  private readonly source: string;
  private readonly tenantId: string;

  constructor(source: string) {
    this.source = source;
    this.tenantId = process.env.DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID;
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    baseLog.info(message, metadata);
    const categoryResult = categorizeLog(message, metadata);

    ingestTelemetry({
      message,
      source: this.source,
      level: "info",
      metadata,
      categoryName: categoryResult.category,
      tenantId: this.tenantId,
      sessionId:
        typeof metadata?.sessionId === "string"
          ? metadata.sessionId
          : (process.env.AGENT_SESSION_ID ?? null),
    }).catch(console.error);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    baseLog.warn(message, metadata);
    const categoryResult = categorizeLog(message, metadata);

    ingestTelemetry({
      message,
      source: this.source,
      level: "warn",
      metadata,
      categoryName: categoryResult.category,
      tenantId: this.tenantId,
      sessionId:
        typeof metadata?.sessionId === "string"
          ? metadata.sessionId
          : (process.env.AGENT_SESSION_ID ?? null),
    }).catch(console.error);
  }

  error(error: unknown, metadata?: Record<string, unknown>): void {
    // parseError logs to Sentry and also calls baseLog.error internally
    const parsedMessage = parseError(error, metadata);

    const categoryResult = categorizeLog(parsedMessage, metadata);

    ingestTelemetry({
      message: parsedMessage,
      source: this.source,
      level: "error",
      metadata,
      categoryName: categoryResult.category,
      tenantId: this.tenantId,
      sessionId:
        typeof metadata?.sessionId === "string"
          ? metadata.sessionId
          : (process.env.AGENT_SESSION_ID ?? null),
    }).catch(console.error);
  }
}

export const createLogger = (source: string) => new Logger(source);
