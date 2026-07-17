import { defineConfig } from 'vitest/config';
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Strip #! shebang so Vite/Vitest can parse CLI modules imported by tests. */
function stripShebangPlugin() {
  return {
    name: "strip-shebang",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("scripts") || !code.startsWith("#!")) return null;
      return { code: code.replace(/^#![^\n]*\n/, ""), map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripShebangPlugin()],
  test: {
    projects: [
      {
        plugins: [stripShebangPlugin()],
        test: {
          name: "orchestration",
          root: __dirname,
          include: ["scripts/__tests__/**/*.test.mjs"],
          exclude: ["scripts/knowledge-management/**"],
          testTimeout: 120_000,
        },
      },
      resolve(__dirname, "scripts/knowledge-management/vitest.config.mts"),
    ],
  },
});
