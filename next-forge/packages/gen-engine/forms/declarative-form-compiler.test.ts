import { describe, expect, it } from "vitest";
import {
  compileDeclarativeForm,
  parseDeclarativeFormValues,
} from "./declarative-form-compiler";

describe("DeclarativeFormCompiler", () => {
  it("compiles tool attrs to Zod schema and descriptor", () => {
    const descriptor = compileDeclarativeForm({
      toolName: "Git status",
      toolDescription: "Inspect repository state",
      parameterSchema: {
        type: "object",
        properties: {
          action: { enum: ["status", "diff"], description: "Git operation" },
          branch: { type: "string", description: "Branch name" },
        },
        required: ["action"],
      },
      autoSubmit: true,
    });

    expect(descriptor.name).toBe("Git status");
    expect(descriptor.autoSubmit).toBe(true);
    expect(descriptor.inputSchema.required).toEqual(["action"]);

    const parsed = parseDeclarativeFormValues(descriptor, {
      action: "status",
      branch: "dev",
    });
    expect(parsed.success).toBe(true);
  });
});
