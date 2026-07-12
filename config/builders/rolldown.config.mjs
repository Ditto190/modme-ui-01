import { defineConfig } from "rolldown";
import { bundleAnalyzerPlugin } from "rolldown/experimental";

/**
 * Root orchestration smoke bundle — control-cli harness + agent-status.
 * Emits analyze-data.json via experimental bundleAnalyzerPlugin for Vitest.
 */
export default defineConfig({
  input: {
    "control-cli-harness": "scripts/control-cli-harness.mjs",
    "agent-status": "scripts/agent-status.mjs",
  },
  output: {
    dir: ".cache/builders/rolldown",
    format: "esm",
    entryFileNames: "[name].mjs",
  },
  platform: "node",
  plugins: [
    bundleAnalyzerPlugin({
      fileName: "analyze-data.json",
    }),
  ],
});
