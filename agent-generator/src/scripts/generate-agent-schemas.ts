/**
 * Generate Zod schemas and TypeScript types for Agent tools
 *
 * This script uses schema-crawler to transform the JSON schemas
 * of our agent tools into proper Zod validation and TypeScript types.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { generateSchemaFileStructure } from "../mcp-registry/schema-crawler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENT_TOOLS_SCHEMA = path.join(__dirname, "../tools/agent-tools.json");
const OUTPUT_DIR = path.join(__dirname, "../../output/schemas");

interface ToolDefinition {
  name: string;
  inputSchema: any;
  outputSchema?: any;
}

async function main() {
  console.log("Generating Agent Tool Schemas...");

  // Read agent tools JSON schema
  const schemaContent = fs.readFileSync(AGENT_TOOLS_SCHEMA, "utf-8");
  const schemas = JSON.parse(schemaContent);

  // Convert to tool definitions
  const tools: ToolDefinition[] = Object.keys(schemas).map((toolName) => ({
    name: toolName,
    inputSchema: schemas[toolName],
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["success", "error", "warning"] },
        message: { type: "string" },
      },
      required: ["status", "message"],
    },
  }));

  console.log(`Found ${tools.length} agent tools`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate schema file structure
  const fileMap = generateSchemaFileStructure("agent-tools", tools);

  // Write files
  fileMap.forEach((content, filePath) => {
    const fullPath = path.join(OUTPUT_DIR, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  ✓ Generated ${filePath}`);
  });

  console.log(`\nSchema generation complete!`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log("\nGenerated files:");
  fileMap.forEach((_, filePath) => {
    console.log(`  - ${filePath}`);
  });
}

main().catch((error) => {
  console.error("Error generating schemas:", error);
  process.exit(1);
});
