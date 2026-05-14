/**
 * chat-formats/openapi.ts
 *
 * Generates OpenAPI 3.1 specification from the canonical Zod schemas in types.ts.
 *
 * SINGLE SOURCE OF TRUTH: All data schemas live in types.ts.
 * This file only adds:
 *   - API-specific schemas (IngestSuccessResponse, ErrorResponse, DiscoverySample)
 *   - OpenAPI document structure (paths, servers, tags, examples)
 *
 * This enables:
 * - Auto-generated API documentation for the /ingest endpoint
 * - Schema sharing with external tools (Postman, Swagger UI, etc.)
 * - Client SDK generation via @hey-api/openapi-ts
 * - Contract testing between TypeScript pipeline and Python bridge
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
// IMPORT CANONICAL SCHEMAS FROM types.ts (single source of truth)
// ============================================================================

import {
  FingerprintRuleSchema,
  TokenUsageSchema,
  ToolCallSchema,
  UniversalTurnPayloadSchema,
  UniversalTurnSchema,
} from "./types";

// Re-export for consumers who only import from openapi.ts
export {
  FingerprintRuleSchema,
  TokenUsageSchema,
  ToolCallSchema,
  UniversalTurnPayloadSchema,
  UniversalTurnSchema,
};

// ============================================================================
// API-SPECIFIC SCHEMAS (not in types.ts — only relevant to the HTTP layer)
// ============================================================================

/**
 * Successful ingestion response from POST /ingest
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
 * Error response for 4xx/5xx responses
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string().describe("Error message"),
    code: z.string().optional().describe("Error code for programmatic handling"),
  })
  .describe("Error response");

/**
 * Discovery sample returned when an unknown format is submitted (422).
 * This is the API-facing shape; see discovery.ts StructuralSample for internal use.
 */
export const DiscoverySampleSchema = z
  .object({
    timestamp: z.string().describe("ISO 8601 timestamp when sample was created"),
    filename: z.string().optional().describe("Original filename if provided"),
    totalSize: z.number().int().describe("Original file size in bytes"),
    turnsCount: z.number().int().describe("Estimated number of turns detected"),
    topLevelKeys: z.array(z.string()).describe("Top-level JSON keys found"),
    deepKeyMap: z
      .record(z.string(), z.string())
      .describe("Map of all paths to their types"),
    candidateTurnsPath: z
      .string()
      .nullable()
      .describe("Best guess for the turns array path"),
    firstTurnSample: z
      .unknown()
      .optional()
      .describe("Truncated first turn for schema generation"),
    detectionErrors: z.array(z.string()).describe("Why detection failed"),
  })
  .describe("Discovery sample for unknown chat formats");

export type DiscoverySample = z.infer<typeof DiscoverySampleSchema>;

// ============================================================================
// OPENAPI DOCUMENT GENERATION
// ============================================================================

/**
 * Generate the complete OpenAPI 3.1 document.
 *
 * Uses createSchema() from zod-openapi to convert Zod → JSON Schema,
 * then assembles the full OpenAPI doc with paths, examples, and $refs.
 */
export function generateOpenApiDocument() {
  // Convert Zod schemas to JSON Schema via zod-openapi
  const componentSchemas = {
    ToolCall: createSchema(ToolCallSchema).schema,
    TokenUsage: createSchema(TokenUsageSchema).schema,
    UniversalTurn: createSchema(UniversalTurnSchema).schema,
    UniversalTurnPayload: createSchema(UniversalTurnPayloadSchema).schema,
    FingerprintRule: createSchema(FingerprintRuleSchema).schema,
    IngestSuccessResponse: createSchema(IngestSuccessResponseSchema).schema,
    ErrorResponse: createSchema(ErrorResponseSchema).schema,
    DiscoverySample: createSchema(DiscoverySampleSchema).schema,
  };

  const openApiDoc = {
    openapi: "3.1.0",
    info: {
      title: "Universal Chat Ingestion API",
      version: "2.1.0",
      description: `
# Universal Chat Ingestion Bridge

A format-agnostic API for ingesting AI chat conversations into Phoenix observability.

## Architecture

\`\`\`
any-agent-chat.json → n8n Workflow → /ingest → OTLP Spans → Phoenix
\`\`\`

## Schema Provenance

All data schemas are defined once in \`types.ts\` (Zod) and flow to:
- **TypeScript pipeline** — Zod runtime validation
- **OpenAPI spec** — this document (via zod-openapi)
- **Python bridge** — Pydantic models (generated from this spec)
- **Client SDKs** — TypeScript client (via @hey-api/openapi-ts)

## Supported Formats

- **copilot-chat**: VS Code Copilot Chat exports
- *More formats added via schema-crawler + offline AI*

## Adding New Formats

When an unknown format is submitted, the API returns a \`discoverySample\`
with structural analysis. Use this sample to generate a new
\`ChatFormatDescriptor\` offline with the schema-crawler tools.

## Related

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
      { name: "Ingestion", description: "Endpoints for uploading chat traces" },
      { name: "Formats", description: "Chat format metadata and discovery" },
      { name: "System", description: "Health and status endpoints" },
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
                      userMessage:
                        "Help me refactor this function to use async/await",
                      assistantResponse: "Here is the refactored version...",
                      model: "claude-sonnet-4-20250514",
                      timestampMs: 1707350400000,
                      latencyMs: 3200,
                      tokens: { prompt: 1500, completion: 800 },
                      toolCalls: [
                        {
                          name: "read_file",
                          input: '{"path":"src/index.ts"}',
                          output: "...",
                        },
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
                  schema: {
                    $ref: "#/components/schemas/IngestSuccessResponse",
                  },
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
                      discoverySample: {
                        $ref: "#/components/schemas/DiscoverySample",
                      },
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
          description:
            "Returns the list of chat formats the bridge can process.",
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
                    version: "2.1.0",
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
      schemas: componentSchemas,
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
  console.log(
    `   Schemas: ${Object.keys(doc.components.schemas).join(", ")}`
  );
  console.log(`   Endpoints: ${Object.keys(doc.paths).join(", ")}`);

  return finalPath;
}

// Run if executed directly
const isMain =
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`;
if (isMain) {
  generateAndSaveSpec();
}
