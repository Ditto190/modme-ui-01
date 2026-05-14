/**
 * Message Ingestion Core
 *
 * Main ingestion function with schema registry and AI-powered discovery fallback.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { createSchemaRegistry, detectProvider } from "./registry";
import {
  type AIProvider,
  type BatchIngestResult,
  type IngestionConfig,
  type IngestResult,
  MessageIngestionError,
  type ParsedMessage,
  SchemaDiscoveryError,
} from "./types";

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: IngestionConfig = {
  schemaRegistry: createSchemaRegistry(),
  discoveryFallback: true,
  cacheStrategy: "memory",
  validationMode: "strict",
  batchSize: 100,
  discoveryTimeout: 30000, // 30 seconds
};

// ============================================================================
// Discovery Cache
// ============================================================================

const discoveryCache = new Map<string, z.ZodSchema>();

// ============================================================================
// Schema Discovery (AI-powered)
// ============================================================================

async function inferSchema(
  sampleMessages: unknown[],
  config: IngestionConfig
): Promise<z.ZodSchema> {
  if (sampleMessages.length === 0) {
    throw new SchemaDiscoveryError("Cannot infer schema from empty sample set", sampleMessages);
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: z.object({
        provider: z.string().describe("Detected provider name"),
        description: z.string().describe("Description of the message format"),
        fields: z
          .array(
            z.object({
              path: z.string().describe("JSON path to field (e.g., 'content.text')"),
              type: z
                .enum(["string", "number", "boolean", "array", "object"])
                .describe("Field type"),
              required: z.boolean().describe("Is this field required?"),
              description: z.string().describe("Field description"),
            })
          )
          .describe("List of fields in the message schema"),
        hasToolCalls: z.boolean().describe("Does this format include tool/function calls?"),
        hasStreaming: z.boolean().describe("Does this format support streaming?"),
        exampleMessage: z.unknown().describe("A representative example message"),
      }),
      prompt: `Analyze these AI agent chat messages and infer the schema structure.

Messages (up to 3 samples):
${JSON.stringify(sampleMessages.slice(0, 3), null, 2)}

Please identify:
1. The provider/format (e.g., "claude", "openai", "custom")
2. Key fields and their types
3. Whether it supports tool calls or streaming
4. A representative example message

Be specific and accurate in your analysis.`,
      maxTokens: 4000,
    });

    // Cache the discovery result
    const cacheKey = `${object.provider}_inferred`;
    const schema = buildZodSchemaFromFields(object.fields);
    discoveryCache.set(cacheKey, schema);

    console.log(`[Discovery] Inferred schema for provider: ${object.provider}`);
    console.log(`[Discovery] Fields: ${JSON.stringify(object.fields, null, 2)}`);

    return schema;
  } catch (error) {
    throw new SchemaDiscoveryError(
      `Schema inference failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      sampleMessages
    );
  }
}

// ============================================================================
// Dynamic Zod Schema Builder
// ============================================================================

function buildZodSchemaFromFields(
  fields: Array<{
    path: string;
    type: string;
    required: boolean;
    description: string;
  }>
): z.ZodSchema {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const pathParts = field.path.split(".");
    const fieldName = pathParts[pathParts.length - 1];

    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "string":
        fieldSchema = z.string();
        break;
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "array":
        fieldSchema = z.array(z.unknown());
        break;
      case "object":
        fieldSchema = z.record(z.unknown());
        break;
      default:
        fieldSchema = z.unknown();
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[fieldName] = fieldSchema;
  }

  return z.object(schemaFields);
}

// ============================================================================
// Best-Effort Parser (for loose validation mode)
// ============================================================================

function bestEffortParse(raw: unknown, provider: AIProvider): ParsedMessage {
  const obj = raw as Record<string, unknown>;

  return {
    id: (obj.id as string) || `msg_${Date.now()}`,
    provider,
    role: (obj.role as "user" | "assistant") || "assistant",
    content:
      typeof obj.content === "string" ? obj.content : JSON.stringify(obj.content || obj, null, 2),
    metadata: {
      bestEffort: true,
      originalProvider: provider,
    },
    rawMessage: raw,
  };
}

// ============================================================================
// Single Message Ingestion
// ============================================================================

export async function ingestMessage(
  rawMessage: unknown,
  config: Partial<IngestionConfig> = {}
): Promise<IngestResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // 1. Detect provider
    const provider = detectProvider(rawMessage);

    // 2. Try schema registry (fast path)
    const schemaDefinition = finalConfig.schemaRegistry.get(provider);
    if (schemaDefinition) {
      try {
        const validated = schemaDefinition.zodSchema.parse(rawMessage);
        const parsed = schemaDefinition.parser(validated);
        return { success: true, data: parsed };
      } catch (error) {
        if (finalConfig.validationMode === "strict") {
          throw new MessageIngestionError(
            `Validation failed for provider ${provider}`,
            provider,
            rawMessage,
            error as z.ZodError
          );
        }
        // Fall through to discovery in loose mode
      }
    }

    // 3. Discovery fallback
    if (finalConfig.discoveryFallback && provider === "unknown") {
      const schema = await inferSchema([rawMessage], finalConfig);
      const validated = schema.parse(rawMessage);

      // Convert to ParsedMessage using best-effort
      const parsed = bestEffortParse(validated, "custom");
      return { success: true, data: parsed };
    }

    // 4. Last resort: best-effort parsing
    if (finalConfig.validationMode === "loose") {
      const parsed = bestEffortParse(rawMessage, provider);
      return { success: true, data: parsed };
    }

    throw new MessageIngestionError(
      `No schema found for provider ${provider} and discovery disabled`,
      provider,
      rawMessage
    );
  } catch (error) {
    if (error instanceof MessageIngestionError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new MessageIngestionError(
        error instanceof Error ? error.message : "Unknown error",
        "unknown",
        rawMessage
      ),
    };
  }
}

// ============================================================================
// Batch Message Ingestion
// ============================================================================

export async function ingestMessageBatch(
  rawMessages: unknown[],
  config: Partial<IngestionConfig> = {}
): Promise<BatchIngestResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const batchSize = finalConfig.batchSize || DEFAULT_CONFIG.batchSize!;

  const successful: ParsedMessage[] = [];
  const failed: Array<{ raw: unknown; error: MessageIngestionError }> = [];

  // Process in chunks to avoid overwhelming the system
  for (let i = 0; i < rawMessages.length; i += batchSize) {
    const chunk = rawMessages.slice(i, i + batchSize);

    const results = await Promise.allSettled(chunk.map((msg) => ingestMessage(msg, finalConfig)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const rawMessage = chunk[j];

      if (result.status === "fulfilled") {
        if (result.value.success) {
          successful.push(result.value.data);
        } else {
          failed.push({ raw: rawMessage, error: result.value.error });
        }
      } else {
        failed.push({
          raw: rawMessage,
          error: new MessageIngestionError(
            result.reason?.message || "Unknown error",
            "unknown",
            rawMessage
          ),
        });
      }
    }
  }

  return {
    successful,
    failed,
    stats: {
      total: rawMessages.length,
      succeeded: successful.length,
      failed: failed.length,
    },
  };
}

// ============================================================================
// Utility: Clear Discovery Cache
// ============================================================================

export function clearDiscoveryCache(): void {
  discoveryCache.clear();
  console.log("[Discovery] Cache cleared");
}

// ============================================================================
// Utility: Get Discovery Cache Stats
// ============================================================================

export function getDiscoveryCacheStats() {
  return {
    size: discoveryCache.size,
    keys: Array.from(discoveryCache.keys()),
  };
}
