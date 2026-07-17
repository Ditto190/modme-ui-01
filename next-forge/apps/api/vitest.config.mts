import path from "node:path";
import { defineConfig } from "vitest/config";

// API tests run in node; do not load @vitejs/plugin-react (avoids
// ERR_PACKAGE_PATH_NOT_EXPORTED when plugin-react 6 resolves against older vite).
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
      "server-only": path.resolve(
        import.meta.dirname,
        "./vitest-mocks/server-only.ts"
      ),
    },
  },
});
