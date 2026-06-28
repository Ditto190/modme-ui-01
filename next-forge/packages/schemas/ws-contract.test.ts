import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AgentActionSchema,
  AgentStateSchema,
  DonePayloadSchema,
  OptimisticMessageSchema,
  TokenEventPayloadSchema,
  ToolResultPayloadSchema,
  ToolStartPayloadSchema,
  WebSocketMessageSchema,
} from "./index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = resolve(
  __dirname,
  "fixtures/genui-agent-contract.golden.json"
);

interface GoldenContract {
  contractVersion: number;
  enums: {
    agentActionTypes: string[];
    agentStateStatuses: string[];
    optimisticMessageRoles: string[];
    webSocketMessageTypes: string[];
  };
  agentAction: unknown;
  agentState: unknown;
  agentStateError: unknown;
  tokenEvent: unknown;
  toolStart: unknown;
  toolResult: unknown;
  done: unknown;
  optimisticMessage: unknown;
  webSocketMessages: unknown[];
}

function loadGolden(): GoldenContract {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as GoldenContract;
}

describe("WS contract vs golden JSON", () => {
  const golden = loadGolden();

  it("matches contract version 1", () => {
    expect(golden.contractVersion).toBe(1);
  });

  it("parses all golden WebSocket message types", () => {
    for (const raw of golden.webSocketMessages) {
      const message = WebSocketMessageSchema.parse(raw);
      expect(golden.enums.webSocketMessageTypes).toContain(message.type);
    }
  });

  it("covers every declared WebSocket message type enum", () => {
    expect(golden.enums.webSocketMessageTypes.sort()).toEqual(
      [
        "action",
        "done",
        "error",
        "ping",
        "pong",
        "state_update",
        "token",
        "tool_result",
        "tool_start",
      ].sort()
    );
  });

  it("parses agent action and state fixtures", () => {
    AgentActionSchema.parse(golden.agentAction);
    AgentStateSchema.parse(golden.agentState);
    AgentStateSchema.parse(golden.agentStateError);
  });

  it("parses streaming payload fixtures", () => {
    TokenEventPayloadSchema.parse(golden.tokenEvent);
    ToolStartPayloadSchema.parse(golden.toolStart);
    ToolResultPayloadSchema.parse(golden.toolResult);
    DonePayloadSchema.parse(golden.done);
    OptimisticMessageSchema.parse(golden.optimisticMessage);
  });

  it("validates all agent action type enum values", () => {
    for (const actionType of golden.enums.agentActionTypes) {
      AgentActionSchema.parse({
        id: `action-${actionType}`,
        type: actionType,
        timestamp: 1,
      });
    }
  });

  it("validates all agent state status enum values", () => {
    for (const status of golden.enums.agentStateStatuses) {
      AgentStateSchema.parse({ actions: [], status });
    }
  });
});
