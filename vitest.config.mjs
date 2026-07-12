import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "orchestration",
          include: ["scripts/__tests__/**/*.test.mjs"],
          exclude: ["scripts/__tests__/km-pipeline.e2e.test.mjs"],
        },
      },
      {
        test: {
          name: "knowledge-management",
          include: ["scripts/__tests__/km-pipeline.e2e.test.mjs"],
        },
      },
    ],
  },
});
