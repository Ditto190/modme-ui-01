import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AgentActionSchema,
  AgentStateSchema,
  DonePayloadSchema,
  EvalSignalSchema,
  OBSERVABILITY_CONTRACT_VERSION,
  OptimisticMessageSchema,
  PipelineRunSchema,
  TelemetryEventSchema,
  TestResultSchema,
  TokenEventPayloadSchema,
  ToolResultPayloadSchema,
  ToolStartPayloadSchema,
  WebSocketMessageSchema,
} from "./index";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "genui-agent-contract.golden.json"
);

interface GoldenContract {
  agentAction: Record<string, unknown>;
  agentState: Record<string, unknown>;
  agentStateError: Record<string, unknown>;
  contractVersion: number;
  done: Record<string, unknown>;
  enums: {
    agentActionTypes: string[];
    agentStateStatuses: string[];
    optimisticMessageRoles: string[];
    webSocketMessageTypes: string[];
  };
  optimisticMessage: Record<string, unknown>;
  tokenEvent: Record<string, unknown>;
  toolResult: Record<string, unknown>;
  toolStart: Record<string, unknown>;
  webSocketMessages: Record<string, unknown>[];
}

const golden = JSON.parse(readFileSync(fixturePath, "utf8")) as GoldenContract;

const observabilityFixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "observability-contract.golden.json"
);

interface ObservabilityGoldenContract {
  contractVersion: string;
  enums: {
    agentRoles?: string[];
    evalImpactLevels: string[];
    pipelineStatuses: string[];
    severities?: string[];
    telemetryLevels: string[];
    telemetrySources?: string[];
  };
  evalSignal: Record<string, unknown>;
  leanCtxTelemetryEvent?: Record<string, unknown>;
  pipelineRun: Record<string, unknown>;
  telemetryEvent: Record<string, unknown>;
  testResult: Record<string, unknown>;
}

const observabilityGolden = JSON.parse(
  readFileSync(observabilityFixturePath, "utf8")
) as ObservabilityGoldenContract;

function minimalAgentAction(type: string) {
  return {
    id: `action-${type}`,
    type,
    timestamp: 1_719_494_400_000,
  };
}

describe("@repo/schemas genui agent contract", () => {
  it("matches golden contract version", () => {
    expect(golden.contractVersion).toBe(1);
  });

  it("parses golden AgentAction fixture", () => {
    expect(AgentActionSchema.parse(golden.agentAction)).toMatchObject({
      id: "action-001",
      type: "render",
      componentType: "StatCard",
    });
  });

  it("parses golden AgentState fixtures", () => {
    expect(AgentStateSchema.parse(golden.agentState).status).toBe("streaming");
    expect(AgentStateSchema.parse(golden.agentStateError).error).toBe(
      "Model rate limit exceeded"
    );
  });

  it("parses golden streaming and tool lifecycle payloads", () => {
    expect(TokenEventPayloadSchema.parse(golden.tokenEvent)).toEqual({
      delta: "hello",
      seq: 1,
      runId: "run-abc",
    });
    expect(ToolStartPayloadSchema.parse(golden.toolStart).name).toBe(
      "fetch_data"
    );
    expect(ToolResultPayloadSchema.parse(golden.toolResult).callId).toBe(
      "call-001"
    );
    expect(DonePayloadSchema.parse(golden.done).runId).toBe("run-abc");
  });

  it("parses golden OptimisticMessage fixture", () => {
    expect(OptimisticMessageSchema.parse(golden.optimisticMessage)).toEqual({
      id: "msg-001",
      role: "user",
      content: "Summarize the dashboard",
      pending: true,
    });
  });

  it("parses all golden WebSocket message fixtures", () => {
    for (const message of golden.webSocketMessages) {
      expect(() => WebSocketMessageSchema.parse(message)).not.toThrow();
    }
  });

  it("accepts all golden enum literals for AgentAction.type", () => {
    for (const type of golden.enums.agentActionTypes) {
      expect(AgentActionSchema.parse(minimalAgentAction(type)).type).toBe(type);
    }
    expect(() =>
      AgentActionSchema.parse(minimalAgentAction("invalid"))
    ).toThrow();
  });

  it("accepts all golden enum literals for AgentState.status", () => {
    for (const status of golden.enums.agentStateStatuses) {
      expect(AgentStateSchema.parse({ actions: [], status }).status).toBe(
        status
      );
    }
    expect(() =>
      AgentStateSchema.parse({ actions: [], status: "invalid" })
    ).toThrow();
  });

  it("accepts all golden enum literals for OptimisticMessage.role", () => {
    for (const role of golden.enums.optimisticMessageRoles) {
      expect(
        OptimisticMessageSchema.parse({
          id: "msg",
          role,
          content: "hi",
        }).role
      ).toBe(role);
    }
  });

  it("accepts all golden enum literals for WebSocketMessage.type", () => {
    for (const type of golden.enums.webSocketMessageTypes) {
      expect(WebSocketMessageSchema.parse({ type }).type).toBe(type);
    }
    expect(() => WebSocketMessageSchema.parse({ type: "invalid" })).toThrow();
  });

  it("snapshots enum contract from golden fixtures", () => {
    expect(golden.enums).toMatchSnapshot();
  });
});

describe("@repo/schemas observability contract", () => {
  it("matches golden contract version", () => {
    expect(observabilityGolden.contractVersion).toBe(
      OBSERVABILITY_CONTRACT_VERSION
    );
  });

  it("parses golden observability fixtures", () => {
    expect(
      TelemetryEventSchema.parse(observabilityGolden.telemetryEvent).level
    ).toBe("warn");
    expect(
      PipelineRunSchema.parse(observabilityGolden.pipelineRun).status
    ).toBe("completed");
    expect(EvalSignalSchema.parse(observabilityGolden.evalSignal).impact).toBe(
      "medium"
    );
    expect(TestResultSchema.parse(observabilityGolden.testResult).passed).toBe(
      true
    );
  });

  it("accepts all golden enum literals for TelemetryEvent.level", () => {
    for (const level of observabilityGolden.enums.telemetryLevels) {
      expect(
        TelemetryEventSchema.parse({
          ...observabilityGolden.telemetryEvent,
          level,
        }).level
      ).toBe(level);
    }
    expect(() =>
      TelemetryEventSchema.parse({
        ...observabilityGolden.telemetryEvent,
        level: "invalid",
      })
    ).toThrow();
  });

  it("accepts all golden enum literals for PipelineRun.status", () => {
    for (const status of observabilityGolden.enums.pipelineStatuses) {
      expect(
        PipelineRunSchema.parse({
          ...observabilityGolden.pipelineRun,
          status,
        }).status
      ).toBe(status);
    }
    expect(() =>
      PipelineRunSchema.parse({
        ...observabilityGolden.pipelineRun,
        status: "invalid",
      })
    ).toThrow();
  });

  it("accepts all golden enum literals for EvalSignal.impact", () => {
    for (const impact of observabilityGolden.enums.evalImpactLevels) {
      expect(
        EvalSignalSchema.parse({
          ...observabilityGolden.evalSignal,
          impact,
        }).impact
      ).toBe(impact);
    }
    expect(() =>
      EvalSignalSchema.parse({
        ...observabilityGolden.evalSignal,
        impact: "invalid",
      })
    ).toThrow();
  });

  it("snapshots observability enum contract from golden fixtures", () => {
    expect(observabilityGolden.enums).toMatchSnapshot();
  });
});
