#!/usr/bin/env node
// ES module YAML parser and collection-set generator
import fs from "fs/promises";
import yaml from "js-yaml";
import path from "path";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

async function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

export async function parseCollectionYaml(filePath) {
  return safeFileOperation(
    async () => {
      const content = await fs.readFile(filePath, "utf8");
      return yaml.load(content, { schema: yaml.JSON_SCHEMA });
    },
    filePath,
    null
  );
}

export async function parseFrontmatter(filePath) {
  return safeFileOperation(
    async () => {
      const content = await fs.readFile(filePath, "utf8");
      const file = new VFile({ path: filePath, value: content });
      matter(file);
      const frontmatter = file.data.matter || {};

      // Normalize common string fields
      if (frontmatter) {
        if (typeof frontmatter.name === "string") {
          frontmatter.name = frontmatter.name.replace(/[\r\n]+$/g, "").trim();
        }
        if (typeof frontmatter.title === "string") {
          frontmatter.title = frontmatter.title.replace(/[\r\n]+$/g, "").trim();
        }
        if (typeof frontmatter.description === "string") {
          frontmatter.description = frontmatter.description.replace(
            /[\s\r\n]+$/g,
            ""
          );
        }
      }

      return frontmatter;
    },
    filePath,
    null
  );
}

export async function extractAgentMetadata(filePath) {
  const frontmatter = await parseFrontmatter(filePath);
  if (!frontmatter) return null;
  return {
    name: typeof frontmatter.name === "string" ? frontmatter.name : null,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : null,
    tools: frontmatter.tools || [],
    mcpServers: frontmatter["mcp-servers"] || {},
  };
}

export async function extractMcpServerConfigs(filePath) {
  const metadata = await extractAgentMetadata(filePath);
  if (!metadata || !metadata.mcpServers) return [];
  return Object.entries(metadata.mcpServers).map(([name, cfg]) => {
    const copy = { ...cfg };
    return {
      name,
      type: typeof copy.type === "string" ? copy.type : undefined,
      command: typeof copy.command === "string" ? copy.command : undefined,
      args: Array.isArray(copy.args) ? copy.args : undefined,
      url: typeof copy.url === "string" ? copy.url : undefined,
      headers:
        typeof copy.headers === "object" && copy.headers !== null
          ? copy.headers
          : undefined,
    };
  });
}

async function loadJson(filePath) {
  return safeFileOperation(
    async () => JSON.parse(await fs.readFile(filePath, "utf8")),
    filePath,
    null
  );
}

async function validateWithSchema(obj, schemaPath) {
  const schema = await loadJson(schemaPath);
  if (!schema) return { valid: true, errors: null, reason: "no schema found" };
  try {
    // Dynamic import Ajv if available
    const AjvModule = await import("ajv").catch(() => null);
    if (!AjvModule) {
      return {
        valid: true,
        errors: null,
        reason: "ajv not installed, skipping validation",
      };
    }
    const Ajv = AjvModule.default || AjvModule;
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const valid = validate(obj);
    return { valid: !!valid, errors: validate.errors || null };
  } catch (err) {
    return { valid: false, errors: [String(err)] };
  }
}

/**
 * Generate a normalized collection set object from a collection YAML or a folder.
 * If a `schemaPath` is provided and Ajv is installed, validation will be attempted.
 */
export async function generateCollectionSet(inputPath, options = {}) {
  const stat = await safeFileOperation(
    async () => await fs.stat(inputPath),
    inputPath,
    null
  );
  if (!stat) return null;

  let collection = null;
  if (stat.isFile()) {
    collection = await parseCollectionYaml(inputPath);
  } else if (stat.isDirectory()) {
    // Aggregate all .collection.yml files in the directory
    const entries = await fs.readdir(inputPath);
    const files = entries.filter(
      (e) =>
        e.endsWith(".collection.yml") ||
        e.endsWith(".yml") ||
        e.endsWith(".yaml")
    );
    collection = {};
    for (const f of files) {
      const p = path.join(inputPath, f);
      const parsed = await parseCollectionYaml(p);
      if (parsed && typeof parsed === "object") {
        collection[f] = parsed;
      }
    }
  }

  if (!collection) return null;

  // Attach metadata where available (frontmatter in related md files)
  const result = { source: inputPath, collection };

  if (options.schemaPath) {
    const validation = await validateWithSchema(
      result.collection,
      options.schemaPath
    );
    result.validation = validation;
  }

  return result;
}

// CLI entrypoint
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].endsWith("yaml-parser.mjs")
) {
  (async () => {
    const argv = process.argv.slice(2);
    const cmd = argv[0] || "parse";
    const input = argv[1];
    const schemaFlagIndex = argv.indexOf("--schema");
    const schemaPath =
      schemaFlagIndex >= 0 ? argv[schemaFlagIndex + 1] : undefined;

    if (!input) {
      console.error(
        "Usage: node yaml-parser.mjs parse <path> [--schema <schema.json>]"
      );
      process.exit(2);
    }

    if (cmd === "parse") {
      // If the input path does not exist, create it as a collections directory
      try {
        await fs.stat(input);
      } catch (err) {
        // Create directory and exit with an informational empty collection
        try {
          await fs.mkdir(input, { recursive: true });
          const created = {
            source: input,
            collection: {},
            validation: { valid: true, reason: "created_missing_directory" },
          };
          console.info(`Created missing collections directory: ${input}`);
          console.log(JSON.stringify(created, null, 2));
          process.exit(0);
        } catch (mkdirErr) {
          console.error(
            `Failed to create collections directory ${input}:`,
            mkdirErr.message || mkdirErr
          );
          process.exit(4);
        }
      }

      const out = await generateCollectionSet(input, { schemaPath });
      console.log(JSON.stringify(out, null, 2));
      // If validation was requested and failed, exit non-zero
      if (out && out.validation && out.validation.valid === false) {
        console.error(
          "Schema validation failed:",
          JSON.stringify(out.validation.errors, null, 2)
        );
        process.exit(3);
      }
      process.exit(0);
    } else {
      console.error("Unknown command", cmd);
      process.exit(2);
    }
  })();
}
