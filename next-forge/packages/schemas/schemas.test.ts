import { describe, expect, it } from "vitest";
import { AgentStateSchema, WebSocketMessageSchema } from "./index";

describe("@repo/schemas", () => {
  it("parses a valid state_update payload", () => {
    const message = WebSocketMessageSchema.parse({
      type: "state_update",
      payload: {
        actions: [],
        status: "idle",
      },
    });

    expect(message.type).toBe("state_update");
    expect(AgentStateSchema.parse(message.payload).status).toBe("idle");
  });

  it("parses token streaming events", () => {
    const message = WebSocketMessageSchema.parse({
      type: "token",
      payload: { delta: "hello", seq: 1 },
    });

    expect(message.type).toBe("token");
  });
});
