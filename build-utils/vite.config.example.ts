/**
 * Vite Configuration with Unplugin Examples
 *
 * Shows how to use unplugin plugins with Vite
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  aliasPlugin,
  analyzerPlugin,
  autoImportPlugin,
  cssModulesPlugin,
  envPlugin,
  markdownPlugin,
  transformPlugin,
  virtualModulesPlugin,
} from "./unplugin.config";

export default defineConfig({
  plugins: [
    react(),

    // Transform plugin
    transformPlugin.vite(),

    // Virtual modules
    virtualModulesPlugin.vite(),

    // Environment variables
    envPlugin.vite(),

    // Auto-import React hooks
    autoImportPlugin.vite({
      imports: {
        react: ["useState", "useEffect", "useMemo", "useCallback"],
        "@copilotkit/react-core": ["useCopilotAction", "useCoAgent"],
      },
    }),

    // CSS modules with scoped names
    cssModulesPlugin.vite(),

    // Markdown to HTML
    markdownPlugin.vite(),

    // Bundle analyzer
    analyzerPlugin.vite(),

    // Path aliases
    aliasPlugin.vite({
      aliases: {
        "@": "./src",
        "@components": "./src/components",
        "@utils": "./src/utils",
        "@lib": "./src/lib",
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          copilotkit: ["@copilotkit/react-core", "@copilotkit/react-ui"],
        },
      },
    },
  },

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
