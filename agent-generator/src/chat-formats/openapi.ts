/**
 * chat-formats/openapi.ts
 *
 * Exports Zod schemas as OpenAPI 3.1 specification using zod-openapi v5.
 *
 * This enables:
 * - Auto-generated API documentation for the /ingest endpoint
 * - Schema sharing with external tools (Postman, Swagger UI, etc.)
 * - Client SDK generation in any language
 * - Contract testing between TypeScript and Python bridge
 *
 * Usage:
 *   npm run generate:openapi
 *   # Outputs: dist/openapi/universal-chat-ingestion.json
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { createSchema } from "zod-openapi";

// ============================================================================
// SCHEMAS WITH DESCRIPTIONS (zod-openapi v5 uses native .describe())
// ============================================================================

/**
 * Tool call within a conversation turn
 */
export const ToolCallSchema = z
  .object({
    name: z.string().describe('Tool/function name (e.g., "read_file", "search")'),
    input: z.string().optional().describe("Stringified JSON arguments passed to the tool"),
    output: z.string().optional().describe("Stringified JSON result from the tool"),
    round: z
      .number()
      .int()
      .optional()
      .describe("Tool calling round index (0-indexed, for multi-round tool use)"),
  })
  .describe("A single tool invocation within a turn");

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Token usage metrics
 */
export const TokenUsageSchema = z
  .object({
    prompt: z.number().int().default(0).describe("Number of prompt/input tokens"),
    completion: z.number().int().default(0).describe("Number of completion/output tokens"),
    total: z.number().int().optional().describe("Total tokens (if provided by API)"),
  })
  .describe("Token usage metrics for a turn");

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

/**
 * A single conversation turn in the universal format
 */
export const UniversalTurnSchema = z
  .object({
    index: z.number().int().describe("Turn position in conversation (0-indexed)"),
    userMessage: z.string().describe("The human input text"),
    assistantResponse: z.string().describe("The assistant output text"),
    model: z
      .string()
      .default("unknown")
      .describe("Model identifier (e.g., claude-sonnet-4-20250514)"),
    timestampMs: z.number().int().optional().describe("Unix timestamp in milliseconds"),
    latencyMs: z.number().int().optional().describe("Total response time in milliseconds"),
    tokens: TokenUsageSchema.optional(),
    toolCalls: z
      .array(ToolCallSchema)
      .default([])
      .describe("Tools/functions invoked during this turn"),
    thinking: z
      .string()
      .optional()
      .describe("Chain-of-thought / reasoning text (if model provides it)"),
    metadata: z
      .record(z.string(), z.unknown())
      .default({})
      .describe("Agent-specific metadata preserved as-is"),
  })
  .describe("A single conversation turn in the universal format");

export type UniversalTurn = z.infer<typeof UniversalTurnSchema>;

/**
 * Complete payload sent from n8n → Python bridge /ingest
 */
export const UniversalTurnPayloadSchema = z
  .object({
    format: z
      .string()
      .describe("Detected format ID from the registry (e.g., copilot-chat, claude-code)"),
    agent: z.string().describe("AI agent that produced this chat (e.g., GitHub Copilot)"),
    projectName: z
      .string()
      .default("chat-traces")
      .describe("Phoenix project name for trace organization"),
    sessionId: z.string().optional().describe("Session identifier (if available from source)"),
    responder: z.string().optional().describe("User/responder identity"),
    turns: z
      .array(UniversalTurnSchema)
      .min(1)
      .describe("The normalized conversation turns (minimum 1)"),
  })
  .describe("Complete payload sent from n8n to Python bridge /ingest endpoint");

export type UniversalTurnPayload = z.infer<typeof UniversalTurnPayloadSchema>;

/**
 * Fingerprint rule for format detection
 */
export const FingerprintRuleSchema = z
  .object({
    path: z.string().describe("JSONPath-like key to check (dot notation)"),
    check: z
      .enum([
        "exists",
        "type_string",
        "type_number",
        "type_array",
        "type_object",
        "equals",
        "matches",
        "has_key",
      ])
      .describe("Type of check to perform"),
    value: z
      .unknown()
      .optional()
      .describe("Expected value (for equals) or regex pattern (for matches)"),
  })
  .describe("A fingerprint rule for format detection");

export type FingerprintRule = z.infer<typeof FingerprintRuleSchema>;

/**
 * Successful ingestion response
 */
export const IngestSuccessResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().describe("Success message with stats"),
    stats: z.object({
      totalTurns: z.number().int(),
      uploadedTurns: z.number().int(),
      toolCallsFound: z.number().int(),
    }),
  })
  .describe("Successful ingestion response");

/**
 * Error response
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string().describe("Error message"),
    code: z.string().optional().describe("Error code for programmatic handling"),
  })
  .describe("Error response");

/**
 * Discovery sample for unknown formats
 */
export const DiscoverySampleSchema = z
  .object({
    timestamp: z.string().describe("ISO 8601 timestamp when sample was created"),
    filename: z.string().optional().describe("Original filename if provided"),
    totalSize: z.number().int().describe("Original file size in bytes"),
    turnsCount: z.number().int().describe("Estimated number of turns detected"),
    topLevelKeys: z.array(z.string()).describe("Top-level JSON keys found"),
    deepKeyMap: z.record(z.string(), z.string()).describe("Map of all paths to their types"),
    candidateTurnsPath: z.string().nullable().describe("Best guess for the turns array path"),
    firstTurnSample: z.unknown().optional().describe("Truncated first turn for schema generation"),
    detectionErrors: z.array(z.string()).describe("Why detection failed"),
  })
  .describe("Discovery sample for unknown chat formats");

export type DiscoverySample = z.infer<typeof DiscoverySampleSchema>;

// ============================================================================
// OPENAPI DOCUMENT GENERATION
// ============================================================================

/**
 * Generate the complete OpenAPI 3.1 document
 */
export function generateOpenApiDocument() {
  // Convert Zod schemas to JSON Schema
  const toolCallJsonSchema = createSchema(ToolCallSchema);
  const tokenUsageJsonSchema = createSchema(TokenUsageSchema);
  const universalTurnJsonSchema = createSchema(UniversalTurnSchema);
  const universalTurnPayloadJsonSchema = createSchema(UniversalTurnPayloadSchema);
  const ingestSuccessJsonSchema = createSchema(IngestSuccessResponseSchema);
  const errorJsonSchema = createSchema(ErrorResponseSchema);
  const discoverySampleJsonSchema = createSchema(DiscoverySampleSchema);

  // Build the OpenAPI document manually (zod-openapi v5 createDocument expects refs)
  const openApiDoc = {
    openapi: "3.1.0",
    info: {
      title: "Universal Chat Ingestion API",
      version: "2.0.0",
      description: `
# Universal Chat Ingestion Bridge

A format-agnostic API for ingesting AI chat conversations into Phoenix observability.

## Architecture

\`\`\`
any-agent-chat.json → n8n Workflow → /ingest → OTLP Spans → Phoenix
\`\`\`

## Supported Formats

- **copilot-chat**: VS Code Copilot Chat exports
- *More formats coming soon via schema-crawler*

## Adding New Formats

When an unknown format is submitted, the API returns a \`discoverySample\`
with structural analysis. This sample can be used to generate a new
\`ChatFormatDescriptor\` offline using the schema-crawler tools.

## Related Documentation

- [ADR-006: Universal Chat Ingestion Pipeline](https://github.com/Ditto190/modme-ui-01/blob/main/docs/adr-006-universal-chat-ingestion-pipeline.md)
- [Phoenix Documentation](https://docs.arize.com/phoenix)
      `.trim(),
      contact: {
        name: "ModMe GenUI Team",
        url: "https://github.com/Ditto190/modme-ui-01",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:8787",
        description: "Local development bridge",
      },
      {
        url: "http://host.docker.internal:8787",
        description: "Docker-internal bridge (from n8n)",
      },
    ],
    tags: [
      {
        name: "Ingestion",
        description: "Endpoints for uploading chat traces",
      },
      {
        name: "Formats",
        description: "Chat format metadata and discovery",
      },
      {
        name: "System",
        description: "Health and status endpoints",
      },
    ],
    paths: {
      "/ingest": {
        post: {
          operationId: "ingestChatTraces",
          summary: "Ingest normalized chat traces into Phoenix",
          description: `
Accepts pre-normalized conversation turns in the Universal Turn Format and
uploads them as OpenInference-compliant OTLP traces to Phoenix.

The payload should be normalized by the n8n workflow before calling this endpoint.
Each turn becomes an AGENT → LLM span (with optional TOOL child spans).
          `.trim(),
          tags: ["Ingestion"],
          requestBody: {
            description: "Normalized chat conversation payload",
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UniversalTurnPayload" },
                example: {
                  format: "copilot-chat",
                  agent: "GitHub Copilot",
                  projectName: "modme-genui-traces",
                  sessionId: "session-abc-123",
                  responder: "dylan",
                  turns: [
                    {
                      index: 0,
                      userMessage: "Help me refactor this function to use async/await",
                      assistantResponse: "Here is the refactored version...",
                      model: "claude-sonnet-4-20250514",
                      timestampMs: 1707350400000,
                      latencyMs: 3200,
                      tokens: { prompt: 1500, completion: 800 },
                      toolCalls: [
                        { name: "read_file", input: '{"path":"src/index.ts"}', output: "..." },
                      ],
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Traces successfully uploaded to Phoenix",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IngestSuccessResponse" },
                },
              },
            },
            "400": {
              description: "Invalid payload (validation error)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "422": {
              description: "Unknown format (includes discovery sample)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", enum: [false] },
                      error: { type: "string" },
                      discoverySample: { $ref: "#/components/schemas/DiscoverySample" },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Server error (Phoenix upload failed)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/formats": {
        get: {
          operationId: "listSupportedFormats",
          summary: "List supported chat formats",
          description: "Returns the list of chat formats the bridge can process.",
          tags: ["Formats"],
          responses: {
            "200": {
              description: "List of supported format IDs and their metadata",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      formats: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            agent: { type: "string" },
                            status: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  example: {
                    formats: [
                      {
                        id: "copilot-chat",
                        name: "VS Code Copilot Chat",
                        agent: "GitHub Copilot",
                        status: "stable",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/health": {
        get: {
          operationId: "healthCheck",
          summary: "Health check",
          tags: ["System"],
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["healthy"] },
                      version: { type: "string" },
                      phoenixConnected: { type: "boolean" },
                      formats: { type: "array", items: { type: "string" } },
                    },
                  },
                  example: {
                    status: "healthy",
                    version: "2.0.0",
                    phoenixConnected: true,
                    formats: ["copilot-chat"],
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ToolCall: toolCallJsonSchema.schema,
        TokenUsage: tokenUsageJsonSchema.schema,
        UniversalTurn: universalTurnJsonSchema.schema,
        UniversalTurnPayload: universalTurnPayloadJsonSchema.schema,
        IngestSuccessResponse: ingestSuccessJsonSchema.schema,
        ErrorResponse: errorJsonSchema.schema,
        DiscoverySample: discoverySampleJsonSchema.schema,
      },
    },
  };

  return openApiDoc;
}

// ============================================================================
// CLI: GENERATE AND SAVE OPENAPI SPEC
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function generateAndSaveSpec(outputPath?: string) {
  const doc = generateOpenApiDocument();

  const defaultOutput = join(
    __dirname,
    "..",
    "..",
    "dist",
    "openapi",
    "universal-chat-ingestion.json"
  );
  const finalPath = outputPath || defaultOutput;

  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write spec
  writeFileSync(finalPath, JSON.stringify(doc, null, 2), "utf-8");

  console.log(`✅ OpenAPI spec generated: ${finalPath}`);
  console.log(`   Schemas: ToolCall, TokenUsage, UniversalTurn, UniversalTurnPayload, etc.`);
  console.log(`   Endpoints: POST /ingest, GET /formats, GET /health`);

  return finalPath;
}

// Run if executed directly
const isMain = import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`;
if (isMain) {
  generateAndSaveSpec();
}
