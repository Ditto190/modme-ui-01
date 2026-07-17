import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  type GatePhase,
  gateChecks,
  INTAKE_PROMOTION_TAG,
  type PromotionFrontmatter,
  parsePromotionFrontmatter,
  shouldPromoteNote,
  triggerSetHash,
} from "./intake-gates";

function frontmatter(
  overrides: Partial<PromotionFrontmatter> = {}
): PromotionFrontmatter {
  return parsePromotionFrontmatter({
    timestamp: "2026-07-12T00:00:00Z",
    agent: "cursor",
    type: "research",
    ...overrides,
  });
}

describe("shouldPromoteNote truth table", () => {
  const cases: readonly [Partial<PromotionFrontmatter>, boolean][] = [
    [{}, false],
    [{ severity: "low" }, false],
    [{ severity: "medium" }, false],
    [{ severity: "high" }, true],
    [{ severity: "critical" }, true],
    [{ pipeline_ready: true }, true],
    [{ pipeline_ready: false }, false],
    [{ tags: [INTAKE_PROMOTION_TAG] }, true],
    [{ tags: ["misc", INTAKE_PROMOTION_TAG] }, true],
    [{ tags: ["misc"] }, false],
    [{ pipeline_ready: false, severity: "critical" }, true],
    [{ pipeline_ready: true, severity: "low", tags: [] }, true],
  ];

  for (const [overrides, expected] of cases) {
    it(`${JSON.stringify(overrides)} -> ${expected}`, () => {
      expect(shouldPromoteNote(frontmatter(overrides))).toBe(expected);
    });
  }
});

describe("parsePromotionFrontmatter round-trip", () => {
  it("accepts a minimal vault note and reparses its own output", () => {
    const parsed = frontmatter({ tags: ["a"], severity: "high" });
    expect(parsePromotionFrontmatter(parsed)).toEqual(parsed);
  });

  it("rejects an invalid severity at the boundary", () => {
    expect(() => parsePromotionFrontmatter({ severity: "urgent" })).toThrow();
  });
});

describe("triggerSetHash idempotency", () => {
  const hashA = createHash("sha256").update("a").digest("hex");
  const hashB = createHash("sha256").update("b").digest("hex");

  it("same set twice yields the same digest (runs-twice convergence)", () => {
    expect(triggerSetHash([hashA, hashB])).toBe(triggerSetHash([hashA, hashB]));
  });

  it("is order- and duplicate-insensitive", () => {
    expect(triggerSetHash([hashB, hashA, hashA])).toBe(
      triggerSetHash([hashA, hashB])
    );
  });

  it("different sets yield different digests", () => {
    expect(triggerSetHash([hashA])).not.toBe(triggerSetHash([hashB]));
  });
});

describe("gateChecks exhaustiveness", () => {
  const phases: readonly GatePhase[] = [
    { kind: "pre-session" },
    { kind: "during-session" },
    { kind: "pre-upsert" },
    { kind: "post-upsert" },
  ];

  for (const phase of phases) {
    it(`${phase.kind} defines at least one check`, () => {
      expect(gateChecks(phase).length).toBeGreaterThan(0);
    });
  }
});

describe("double-run convergence (watcher skip logic)", () => {
  it("second evaluation of the same trigger set is a skip", () => {
    const noteHashes = [createHash("sha256").update("note body").digest("hex")];
    const firstRunKey = triggerSetHash(noteHashes);
    const lastRun = { key: firstRunKey };

    const secondRunKey = triggerSetHash(noteHashes);
    const shouldRunAgain = secondRunKey !== lastRun.key;
    expect(shouldRunAgain).toBe(false);

    const changedHashes = [
      createHash("sha256").update("edited note body").digest("hex"),
    ];
    expect(triggerSetHash(changedHashes)).not.toBe(lastRun.key);
  });
});
