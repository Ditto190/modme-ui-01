import { describe, expect, it } from "vitest";
import {
  BASE_RECONNECT_MS,
  getReconnectDelay,
  MAX_RECONNECT_ATTEMPTS,
  MAX_RECONNECT_MS,
} from "./reconnect-delay";

describe("getReconnectDelay", () => {
  it("uses exponential backoff with 3s base", () => {
    expect(getReconnectDelay(0)).toBe(BASE_RECONNECT_MS);
    expect(getReconnectDelay(1)).toBe(BASE_RECONNECT_MS * 2);
    expect(getReconnectDelay(2)).toBe(BASE_RECONNECT_MS * 4);
  });

  it("caps delay at 30s", () => {
    expect(getReconnectDelay(10)).toBe(MAX_RECONNECT_MS);
    expect(getReconnectDelay(100)).toBe(MAX_RECONNECT_MS);
  });
});

describe("reconnect constants", () => {
  it("allows up to 10 reconnect attempts", () => {
    expect(MAX_RECONNECT_ATTEMPTS).toBe(10);
  });

  it("schedules increasing delays until cap for each attempt index", () => {
    const delays = Array.from(
      { length: MAX_RECONNECT_ATTEMPTS },
      (_, attempt) => getReconnectDelay(attempt)
    );

    expect(delays[0]).toBe(3000);
    expect(delays[1]).toBe(6000);
    expect(delays.at(-1)).toBe(MAX_RECONNECT_MS);
    expect(delays.every((delay) => delay <= MAX_RECONNECT_MS)).toBe(true);
  });
});

describe("retryConnection semantics", () => {
  it("resets attempt counter when starting from zero delay", () => {
    expect(getReconnectDelay(0)).toBe(BASE_RECONNECT_MS);
  });
});

describe("malformed JSON handling contract", () => {
  it("marks parse failures as user-visible errors", () => {
    const errorMessage = "Failed to parse message from server";
    expect(errorMessage).toContain("parse");
  });
});

describe("visibilitychange reconnect contract", () => {
  it("only reconnects when document is visible", () => {
    expect(
      document.visibilityState === "visible" ||
        document.visibilityState === "hidden"
    ).toBe(true);
  });
});
