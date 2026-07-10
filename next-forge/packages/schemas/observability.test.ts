import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EvalImpactLevelSchema,
  EvalSignalSchema,
  OBSERVABILITY_CONTRACT_VERSION,
  PipelineRunSchema,
  PipelineStatusSchema,
  TelemetryEventSchema,
  TelemetryLevelSchema,
  TelemetrySourceSchema,
  TestResultSchema,
} from "./observability";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "observability-contract.golden.json"
);

interface GoldenObservability {
  contractVersion: string;
  enums: {
    telemetryLevels: string[];
    pipelineStatuses: string[];
    evalImpactLevels: string[];
    telemetrySources?: string[];
  };
  evalSignal: Record<string, unknown>;
  leanCtxTelemetryEvent?: Record<string, unknown>;
  pipelineRun: Record<string, unknown>;
  telemetryEvent: Record<string, unknown>;
  testResult: Record<string, unknown>;
}

const golden = JSON.parse(
  readFileSync(fixturePath, "utf8")
) as GoldenObservability;

describe("@repo/schemas observability contract", () => {
  it("matches golden contract version", () => {
    expect(golden.contractVersion).toBe(OBSERVABILITY_CONTRACT_VERSION);
  });

  it("parses golden telemetry event fixture", () => {
    expect(TelemetryEventSchema.parse(golden.telemetryEvent).level).toBe(
      "warn"
    );
  });

  it("parses golden pipeline run fixture", () => {
    expect(PipelineRunSchema.parse(golden.pipelineRun).status).toBe(
      "completed"
    );
  });

  it("parses golden eval signal fixture", () => {
    expect(EvalSignalSchema.parse(golden.evalSignal).impact).toBe("medium");
  });

  it("parses golden test result fixture", () => {
    expect(TestResultSchema.parse(golden.testResult).passed).toBe(true);
  });

  it("accepts all golden enum literals for telemetry level", () => {
    for (const level of golden.enums.telemetryLevels) {
      expect(TelemetryLevelSchema.parse(level)).toBe(level);
    }
    expect(() => TelemetryLevelSchema.parse("invalid")).toThrow();
  });

  it("accepts all golden enum literals for pipeline status", () => {
    for (const status of golden.enums.pipelineStatuses) {
      expect(PipelineStatusSchema.parse(status)).toBe(status);
    }
    expect(() => PipelineStatusSchema.parse("invalid")).toThrow();
  });

  it("accepts all golden enum literals for eval impact", () => {
    for (const impact of golden.enums.evalImpactLevels) {
      expect(EvalImpactLevelSchema.parse(impact)).toBe(impact);
    }
    expect(() => EvalImpactLevelSchema.parse("invalid")).toThrow();
  });

  it("snapshots enum contract from golden fixtures", () => {
    expect(golden.enums).toMatchSnapshot();
  });

  describe("lean-ctx source enums (v1.1)", () => {
    const leanCtxSources = [
      "lean-ctx-journal",
      "lean-ctx-tee",
      "lean-ctx-debug",
      "lean-ctx-marker",
      "lean-ctx-archive",
    ] as const;

    it("accepts all lean-ctx source values in TelemetrySourceSchema", () => {
      for (const source of leanCtxSources) {
        expect(TelemetrySourceSchema.parse(source)).toBe(source);
      }
    });

    it("rejects unknown source values", () => {
      expect(() => TelemetrySourceSchema.parse("lean-ctx-unknown")).toThrow();
      expect(() => TelemetrySourceSchema.parse("")).toThrow();
    });

    it("parses lean-ctx golden telemetry event fixture", () => {
      if (!golden.leanCtxTelemetryEvent) {
        return;
      }
      const parsed = TelemetryEventSchema.parse(golden.leanCtxTelemetryEvent);
      expect(parsed.source).toBe("lean-ctx-marker");
      expect(parsed.level).toBe("info");
    });

    it("golden enums include all lean-ctx sources", () => {
      const goldenSources = golden.enums.telemetrySources ?? [];
      for (const source of leanCtxSources) {
        expect(goldenSources).toContain(source);
      }
    });
  });
});
