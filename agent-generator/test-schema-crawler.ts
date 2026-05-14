/**
 * Test script for schema-crawler.ts
 * Generates Zod schemas from sample JSON Schema (simulating MCP tool definitions)
 */

import {
  generateSchemaFileStructure,
  generateZodFromJSONSchema,
  generateZodModule,
} from "./src/mcp-registry/schema-crawler";

// Sample MCP tool JSON Schema (similar to awesome-copilot toolset structure)
const sampleMCPToolSchema = {
  type: "object",
  properties: {
    toolset_name: {
      type: "string",
      description: "The ID of the collection/toolset",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Keywords to search for",
    },
    max_items: {
      type: "number",
      minimum: 1,
      maximum: 50,
      description: "Maximum items to include",
    },
    include_agents: {
      type: "boolean",
      description: "Include agent files",
    },
  },
  required: ["toolset_name"],
};

const sampleOutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["success", "error"],
    },
    collection_id: {
      type: "string",
    },
    item_count: {
      type: "number",
    },
    tags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["status"],
};

console.log("🧪 Testing Schema Crawler\n");

// Test 1: Generate Zod schema
console.log("Test 1: Generate Zod schema from JSON Schema");
console.log("=".repeat(50));
const zodOutput = generateZodFromJSONSchema(sampleMCPToolSchema, "GetToolsetInput");
console.log("\n📝 Generated Zod Code:");
console.log(zodOutput.zodCode);
console.log("\n📘 Generated TypeScript Interface:");
console.log(zodOutput.typeDefinition);
console.log("\n✅ Validator Code:");
console.log(zodOutput.validatorCode);

// Test 2: Generate complete module
console.log("\n" + "=".repeat(50));
console.log("Test 2: Generate complete Zod module");
console.log("=".repeat(50));
const moduleCode = generateZodModule("GetToolsetTools", sampleMCPToolSchema, sampleOutputSchema);
console.log(moduleCode);

// Test 3: Generate file structure for multiple tools
console.log("\n" + "=".repeat(50));
console.log("Test 3: Generate file structure for MCP server");
console.log("=".repeat(50));

const mockTools = [
  {
    name: "get_toolset_tools",
    inputSchema: sampleMCPToolSchema,
    outputSchema: sampleOutputSchema,
  },
  {
    name: "list_collections",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
];

const fileStructure = generateSchemaFileStructure("awesome-copilot", mockTools);

console.log("\n📁 Generated Files:");
fileStructure.forEach((content, filePath) => {
  console.log(`\n--- ${filePath} ---`);
  console.log(content.substring(0, 300) + "...\n");
});

console.log("\n✅ Schema Crawler Tests Complete!");
console.log(`📊 Generated ${fileStructure.size} files for ${mockTools.length} tools`);
