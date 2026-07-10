import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DEV_TENANT_ID,
  normaliseTelemetryPayload,
  TelemetryBatcher,
} from "./telemetry-ingestor";

vi.mock("@repo/database", () => ({
  database: {
    telemetryCategory: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    telemetryEvent: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("telemetry-ingestor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normaliseTelemetryPayload", () => {
    it("should drop invalid non-objects", () => {
      expect(normaliseTelemetryPayload("string")).toBeNull();
      expect(normaliseTelemetryPayload(null)).toBeNull();
      expect(normaliseTelemetryPayload([])).toBeNull();
    });

    it("should drop payloads missing message or source", () => {
      expect(normaliseTelemetryPayload({ message: "test" })).toBeNull();
      expect(normaliseTelemetryPayload({ source: "test" })).toBeNull();
    });

    it("should normalize a valid payload with defaults", () => {
      const result = normaliseTelemetryPayload({
        message: "hello",
        source: "api",
      });
      expect(result).toEqual({
        message: "hello",
        source: "api",
        sessionId: null,
        level: "info",
        metadata: {},
        categoryName: null,
        tenantId: DEFAULT_DEV_TENANT_ID,
      });
    });

    it("should pass through valid properties safely", () => {
      const result = normaliseTelemetryPayload({
        message: "hello",
        source: "api",
        sessionId: "123",
        level: "error",
        metadata: { key: "value" },
        categoryName: "backend",
      });

      expect(result).toEqual({
        message: "hello",
        source: "api",
        sessionId: "123",
        level: "error",
        metadata: { key: "value" },
        categoryName: "backend",
        tenantId: DEFAULT_DEV_TENANT_ID,
      });
    });
  });

  describe("TelemetryBatcher", () => {
    it("should batch up to MAX_BATCH_SIZE events and auto flush", async () => {
      const batcher = new TelemetryBatcher();

      (database.telemetryCategory.findMany as any) = vi
        .fn()
        .mockResolvedValue([]);
      (database.telemetryEvent.createMany as any) = vi
        .fn()
        .mockResolvedValue({});

      // Ingest 99 events
      for (let i = 0; i < 99; i++) {
        await batcher.ingest({ message: `msg${i}`, source: "test" });
      }

      expect(batcher.getQueueLength()).toBe(99);
      expect(database.telemetryEvent.createMany).not.toHaveBeenCalled();

      // Ingest the 100th event, which should trigger flush
      await batcher.ingest({ message: "msg99", source: "test" });

      expect(batcher.getQueueLength()).toBe(0);
      expect(database.telemetryEvent.createMany).toHaveBeenCalledTimes(1);

      const callArgs = (database.telemetryEvent.createMany as any).mock
        .calls[0][0];
      expect(callArgs.data.length).toBe(100);
    });

    it("should resolve and create categories when flushing", async () => {
      const batcher = new TelemetryBatcher();

      (database.telemetryCategory.findMany as any) = vi
        .fn()
        .mockResolvedValueOnce([{ id: "cat-1", name: "backend" }])
        .mockResolvedValueOnce([{ id: "cat-2", name: "new-cat" }]);

      (database.telemetryCategory.createMany as any) = vi
        .fn()
        .mockResolvedValue({});
      (database.telemetryEvent.createMany as any) = vi
        .fn()
        .mockResolvedValue({});

      await batcher.ingest({
        message: "1",
        source: "t",
        categoryName: "backend",
      });
      await batcher.ingest({
        message: "2",
        source: "t",
        categoryName: "new-cat",
      });

      await batcher.flush();

      expect(database.telemetryCategory.createMany).toHaveBeenCalledWith({
        data: [{ name: "new-cat" }],
        skipDuplicates: true,
      });

      const callArgs = (database.telemetryEvent.createMany as any).mock
        .calls[0][0];
      expect(callArgs.data[0].categoryId).toBe("cat-1");
      expect(callArgs.data[1].categoryId).toBe("cat-2");
    });

    it("should fallback to individual inserts on createMany failure", async () => {
      const batcher = new TelemetryBatcher();

      (database.telemetryCategory.findMany as any) = vi
        .fn()
        .mockResolvedValue([]);
      (database.telemetryEvent.createMany as any) = vi
        .fn()
        .mockRejectedValue(new Error("Batch error"));
      (database.telemetryEvent.create as any) = vi.fn().mockResolvedValue({});

      await batcher.ingest({ message: "a", source: "s" });
      await batcher.ingest({ message: "b", source: "s" });

      await batcher.flush();

      expect(database.telemetryEvent.create).toHaveBeenCalledTimes(2);
    });
  });
});
