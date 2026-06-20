import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * esbuild configuration for ModMe GenUI Workbench
 * Supports multiple build targets: agent-generator, scripts, and standalone bundles
 */
const sharedOptions = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
  target: "ES2022",
  platform: "node",
  format: "esm",
  external: ["esbuild"], // Don't bundle esbuild itself
};

// Build configurations for different entry points
export const buildConfigs = {
  // Agent-generator CLI tools (TypeScript → ESM)
  agentGenerator: {
    ...sharedOptions,
    entryPoints: ["agent-generator/src/scripts/generate.ts"],
    outfile: "agent-generator/dist/generate.mjs",
    outExtension: { ".js": ".mjs" },
  },

  // Knowledge management scripts
  syncDocs: {
    ...sharedOptions,
    entryPoints: ["scripts/knowledge-management/sync-docs.js"],
    outfile: "scripts/knowledge-management/dist/sync-docs.mjs",
    outExtension: { ".js": ".mjs" },
    external: ["ajv", "ajv-formats", "marked", "handlebars", "glob"],
  },

  // Toolset management validation
  validateToolsets: {
    ...sharedOptions,
    entryPoints: ["scripts/toolset-management/validate-toolsets.js"],
    outfile: "scripts/toolset-management/dist/validate-toolsets.mjs",
    outExtension: { ".js": ".mjs" },
    external: ["ajv", "ajv-formats"],
  },

  // Detect toolset changes
  detectChanges: {
    ...sharedOptions,
    entryPoints: ["scripts/toolset-management/detect-toolset-changes.js"],
    outfile: "scripts/toolset-management/dist/detect-toolset-changes.mjs",
    outExtension: { ".js": ".mjs" },
    external: ["glob"],
  },

  // Test alias resolution
  testAliases: {
    ...sharedOptions,
    entryPoints: ["scripts/toolset-management/test-alias-resolution.js"],
    outfile: "scripts/toolset-management/dist/test-alias-resolution.mjs",
    outExtension: { ".js": ".mjs" },
  },

  // Generate diagram
  generateDiagram: {
    ...sharedOptions,
    entryPoints: ["scripts/knowledge-management/generate-diagram.js"],
    outfile: "scripts/knowledge-management/dist/generate-diagram.mjs",
    outExtension: { ".js": ".mjs" },
    external: ["glob"],
  },
};

/**
 * Build a specific configuration
 * @param {string} configName - Name of the config to build
 * @param {object} options - Override options
 */
export async function buildConfig(configName, options = {}) {
  const config = buildConfigs[configName];
  if (!config) {
    throw new Error(`Configuration "${configName}" not found`);
  }

  const finalConfig = { ...config, ...options };

  console.log(`Building ${configName}...`);
  console.log(`  Entry: ${finalConfig.entryPoints}`);
  console.log(`  Output: ${finalConfig.outfile}`);

  try {
    const result = await esbuild.build(finalConfig);
    console.log(`✓ ${configName} built successfully`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to build ${configName}:`, error);
    throw error;
  }
}

/**
 * Build all configurations
 */
export async function buildAll() {
  const results = {};
  for (const [name] of Object.entries(buildConfigs)) {
    try {
      results[name] = await buildConfig(name);
    } catch (error) {
      results[name] = { error: error.message };
    }
  }
  return results;
}

/**
 * Development watch mode for a specific config
 */
export async function watch(configName) {
  const config = buildConfigs[configName];
  if (!config) {
    throw new Error(`Configuration "${configName}" not found`);
  }

  console.log(`Watching ${configName}...`);
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log(`Watching for changes... (press Ctrl+C to exit)`);
}

// CLI interface for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "help";
  const configName = process.argv[3];

  if (command === "build") {
    if (!configName) {
      console.log("Building all configurations...");
      await buildAll();
    } else {
      await buildConfig(configName);
    }
  } else if (command === "watch") {
    if (!configName) {
      console.error("❌ Please specify a config to watch: esbuild watch <configName>");
      process.exit(1);
    }
    await watch(configName);
  } else if (command === "list") {
    console.log("Available configurations:");
    Object.keys(buildConfigs).forEach((name) => {
      console.log(`  - ${name}`);
    });
  } else {
    console.log(`
esbuild Configuration for ModMe GenUI Workbench

Usage:
  node esbuild.config.mjs build [configName]     # Build one or all configs
  node esbuild.config.mjs watch <configName>     # Watch and rebuild
  node esbuild.config.mjs list                   # List available configs

Available configs:`);
    Object.keys(buildConfigs).forEach((name) => {
      console.log(`  - ${name}`);
    });
  }
}
