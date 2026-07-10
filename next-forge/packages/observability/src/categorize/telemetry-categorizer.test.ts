import { describe, expect, it } from "vitest";
import { categorizeLog } from "./telemetry-categorizer";

describe("telemetry-categorizer", () => {
  it("Should return uncategorized and info for generic messages", () => {
    const result = categorizeLog("User logged in");
    expect(result).toEqual({ category: "uncategorized", severity: "info" });
  });

  it("Should detect error severity from a message string", () => {
    const result = categorizeLog("Connection failed");
    expect(result.severity).toBe("error");
  });

  it("Should detect warn severity from context level", () => {
    const result = categorizeLog("Resource low", { level: "warn" });
    expect(result.severity).toBe("warn");
  });

  it("Should categorize as backend when mentioning single keywords", () => {
    const result = categorizeLog("Node.js started on port 3000");
    expect(result.category).toBe("backend");
  });

  it("Should weight exact phrases higher", () => {
    // "machine learning" -> 2 pts ai-ml, "pipeline" -> 0 pts
    const result = categorizeLog("machine learning pipeline");
    expect(result.category).toBe("ai-ml");
  });

  it("Should categorize based on keywords found within the context object", () => {
    const result = categorizeLog("System init", { tech: "docker" });
    expect(result.category).toBe("devops");
  });

  it("Should handle circular references in context safely without throwing", () => {
    const context: any = { data: "some data" };
    context.self = context; // Circular reference

    // Should not throw, but will catch the error and not stringify context.
    const result = categorizeLog("Testing react app", context);
    expect(result.category).toBe("web-development"); // matches "react" in message
  });

  it("Should handle overlapping keywords", () => {
    // "database" matches Database (1pt) and Backend (1pt)
    // "sql" matches Database (1pt) and Backend (1pt)
    // If it's a tie, our loop just takes the first one that reached the max score.
    // In our keys list, backend comes before database.
    const result = categorizeLog("Connected to sql database");
    expect(["backend", "database"]).toContain(result.category);
  });
});
