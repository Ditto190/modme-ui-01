/**
 * Unplugin Configuration
 *
 * Unified plugin system for Vite, Rollup, Webpack, esbuild
 * https://github.com/unjs/unplugin
 */

import { createUnplugin } from "unplugin";

// Example 1: Simple transform plugin
export const transformPlugin = createUnplugin(() => ({
  name: "transform-plugin",

  transform(code, id) {
    // Transform source code
    if (id.endsWith(".custom")) {
      return {
        code: code.replace(/TRANSFORM_ME/g, "TRANSFORMED"),
        map: null,
      };
    }
  },
}));

// Example 2: Virtual modules plugin
export const virtualModulesPlugin = createUnplugin(() => {
  const virtualModuleId = "virtual:my-module";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  return {
    name: "virtual-modules",

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const msg = "from virtual module"`;
      }
    },
  };
});

// Example 3: Code injection plugin
export const injectCodePlugin = createUnplugin((options: { code: string }) => ({
  name: "inject-code",

  transform(code, id) {
    if (id.endsWith(".js") || id.endsWith(".ts")) {
      return {
        code: `${options.code}\n${code}`,
        map: null,
      };
    }
  },
}));

// Example 4: Environment variables plugin
export const envPlugin = createUnplugin(() => ({
  name: "env-plugin",

  transform(code, id) {
    if (code.includes("process.env")) {
      const envVars = Object.keys(process.env)
        .filter((key) => key.startsWith("NEXT_PUBLIC_"))
        .reduce((acc, key) => {
          acc[key] = process.env[key];
          return acc;
        }, {} as Record<string, string | undefined>);

      let transformed = code;
      for (const [key, value] of Object.entries(envVars)) {
        const regex = new RegExp(`process\\.env\\.${key}`, "g");
        transformed = transformed.replace(regex, JSON.stringify(value));
      }

      return { code: transformed, map: null };
    }
  },
}));

// Example 5: Auto-import plugin
export const autoImportPlugin = createUnplugin(
  (options: { imports: Record<string, string[]> }) => {
    return {
      name: "auto-import",

      transform(code, id) {
        if (!id.includes("node_modules")) {
          let transformed = code;
          const importsToAdd: string[] = [];

          for (const [pkg, exports] of Object.entries(options.imports)) {
            for (const exp of exports) {
              if (code.includes(exp) && !code.includes(`import`)) {
                importsToAdd.push(`import { ${exp} } from '${pkg}';`);
              }
            }
          }

          if (importsToAdd.length > 0) {
            transformed = importsToAdd.join("\n") + "\n" + code;
          }

          return { code: transformed, map: null };
        }
      },
    };
  }
);

// Example 6: CSS modules plugin
export const cssModulesPlugin = createUnplugin(() => ({
  name: "css-modules",

  transform(code, id) {
    if (id.endsWith(".module.css")) {
      // Generate scoped class names
      const scopedCode = code.replace(
        /\.([a-zA-Z][a-zA-Z0-9_-]*)/g,
        (_, className) => `.scoped_${className}_${generateHash(id)}`
      );

      return { code: scopedCode, map: null };
    }
  },
}));

// Example 7: Markdown plugin
export const markdownPlugin = createUnplugin(() => ({
  name: "markdown",

  transform(code, id) {
    if (id.endsWith(".md")) {
      // Simple markdown to HTML conversion
      const html = code
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");

      return {
        code: `export default ${JSON.stringify(html)}`,
        map: null,
      };
    }
  },
}));

// Example 8: Bundle analyzer plugin
export const analyzerPlugin = createUnplugin(() => ({
  name: "analyzer",

  buildEnd() {
    console.log("[Analyzer] Build completed");
  },

  writeBundle(options, bundle) {
    const sizes: Record<string, number> = {};

    for (const [fileName, chunk] of Object.entries(bundle)) {
      if ("code" in chunk) {
        sizes[fileName] = chunk.code.length;
      }
    }

    console.log("[Analyzer] Bundle sizes:", sizes);
  },
}));

// Example 9: Hot reload plugin
export const hotReloadPlugin = createUnplugin(() => ({
  name: "hot-reload",

  async handleHotUpdate(ctx) {
    console.log("[HMR] File updated:", ctx.file);

    // Custom hot reload logic
    if (ctx.file.endsWith(".custom")) {
      ctx.server.ws.send({
        type: "custom",
        event: "file-updated",
        data: { file: ctx.file },
      });
    }
  },
}));

// Example 10: TypeScript paths alias plugin
export const aliasPlugin = createUnplugin(
  (options: { aliases: Record<string, string> }) => ({
    name: "alias",

    resolveId(source) {
      for (const [alias, target] of Object.entries(options.aliases)) {
        if (source.startsWith(alias)) {
          return source.replace(alias, target);
        }
      }
    },
  })
);

// Utility: Generate hash for scoped class names
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

// Export all plugins for different bundlers
export default {
  // Vite
  vite: [transformPlugin.vite(), virtualModulesPlugin.vite(), envPlugin.vite()],

  // Rollup
  rollup: [
    transformPlugin.rollup(),
    virtualModulesPlugin.rollup(),
    envPlugin.rollup(),
  ],

  // Webpack
  webpack: [
    transformPlugin.webpack(),
    virtualModulesPlugin.webpack(),
    envPlugin.webpack(),
  ],

  // esbuild
  esbuild: [
    transformPlugin.esbuild(),
    virtualModulesPlugin.esbuild(),
    envPlugin.esbuild(),
  ],
};
