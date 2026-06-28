import { database } from "@repo/database";

export const DEFAULT_DEV_TENANT_ID =
  process.env.DEV_TENANT_ID ?? "00000000-0000-4000-8000-000000000001";

export interface TelemetryPayload {
  categoryName?: string | null;
  level?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  sessionId?: string | null;
  source: string;
  tenantId?: string | null;
}

interface NormalizedEvent {
  categoryName: string | null;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  sessionId: string | null;
  source: string;
  tenantId: string;
}

const MAX_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(primary: unknown, fallback: unknown): string | null {
  if (typeof primary === "string") {
    return primary;
  }
  if (typeof fallback === "string") {
    return fallback;
  }
  return null;
}

function readTenantId(value: Record<string, unknown>): string {
  if (typeof value.tenantId === "string") {
    return value.tenantId;
  }
  if (typeof value.tenant_id === "string") {
    return value.tenant_id;
  }
  if (isObjectRecord(value.metadata)) {
    const tenantId = value.metadata.tenant_id;
    if (typeof tenantId === "string") {
      return tenantId;
    }
  }
  return DEFAULT_DEV_TENANT_ID;
}

export function normaliseTelemetryPayload(
  value: unknown
): NormalizedEvent | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const message = typeof value.message === "string" ? value.message : null;
  const source = typeof value.source === "string" ? value.source : null;

  if (!(message && source)) {
    return null; // Both message and source are required
  }

  const sessionId = readStringField(value.sessionId, value.session_id);
  const level = typeof value.level === "string" ? value.level : "info";
  const categoryName =
    typeof value.categoryName === "string" ? value.categoryName : null;
  const tenantId = readTenantId(value);

  let metadata: Record<string, unknown> = {};
  if (isObjectRecord(value.metadata)) {
    try {
      metadata = JSON.parse(JSON.stringify(value.metadata));
    } catch {
      // Drop invalid metadata silently
    }
  }

  return {
    message,
    source,
    sessionId,
    level,
    metadata,
    categoryName,
    tenantId,
  };
}

export class TelemetryBatcher {
  private queue: NormalizedEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  async ingest(event: unknown): Promise<void> {
    const normalized = normaliseTelemetryPayload(event);
    if (!normalized) {
      return;
    }

    this.queue.push(normalized);

    if (this.queue.length >= MAX_BATCH_SIZE) {
      await this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flush().catch((error) => {
          console.error("[TelemetryBatcher] Background flush error:", error);
        });
      }, FLUSH_INTERVAL_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = [...this.queue];
    this.queue = [];

    // Resolve categories
    const categoryNames = [
      ...new Set(batch.map((b) => b.categoryName).filter(Boolean) as string[]),
    ];
    const categoryMap = new Map<string, string>();

    if (categoryNames.length > 0) {
      try {
        const existingCategories = await database.telemetryCategory.findMany({
          where: { name: { in: categoryNames } },
        });

        for (const cat of existingCategories) {
          categoryMap.set(cat.name, cat.id);
        }

        const missing = categoryNames.filter((name) => !categoryMap.has(name));
        if (missing.length > 0) {
          await database.telemetryCategory.createMany({
            data: missing.map((name) => ({ name })),
            skipDuplicates: true,
          });

          const newCategories = await database.telemetryCategory.findMany({
            where: { name: { in: missing } },
          });

          for (const cat of newCategories) {
            categoryMap.set(cat.name, cat.id);
          }
        }
      } catch (error) {
        console.warn("[TelemetryBatcher] Failed to resolve categories", error);
      }
    }

    const eventsData = batch.map((event) => {
      const categoryId = event.categoryName
        ? (categoryMap.get(event.categoryName) ?? null)
        : null;
      return {
        message: event.message,
        source: event.source,
        sessionId: event.sessionId,
        level: event.level,
        metadata: event.metadata,
        categoryId,
        tenantId: event.tenantId,
      };
    });

    try {
      await database.telemetryEvent.createMany({
        data: eventsData,
      });
    } catch (_error) {
      // Fallback: insert individually
      for (const data of eventsData) {
        try {
          await database.telemetryEvent.create({ data });
        } catch (_innerError) {
          // Drop invalid event silently
        }
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const telemetryBatcher = new TelemetryBatcher();

export async function ingestTelemetry(event: TelemetryPayload): Promise<void> {
  await telemetryBatcher.ingest(event);
}
