/**
 * Message Ingestion - Public API
 *
 * Main entry point for message ingestion functionality.
 */

export {
  clearDiscoveryCache,
  getDiscoveryCacheStats,
  // Core functions
  ingestMessage,
  ingestMessageBatch,
} from "./ingestion";

export {
  // Registry utilities
  createSchemaRegistry,
  detectProvider,
} from "./registry";

export {
  MessageIngestionError,
  SchemaDiscoveryError,
  // Types
  type AIProvider,
  type BatchIngestResult,
  type ClaudeContentBlock,
  type ClaudeMessage,
  type CopilotKitMessage,
  type IngestResult,
  type IngestionConfig,
  type MessageMetadata,
  type MessageSchemaDefinition,
  type N8nExecutionData,
  type N8nWebhookResponse,
  type OpenAIMessage,
  type ParsedMessage,
  type SchemaRegistry,
  type ToolCall,
  type ToolResult,
} from "./types";

export {
  // Zod schemas (for validation)
  ClaudeMessageSchema,
  CopilotKitMessageSchema,
  N8nWebhookResponseSchema,
  OpenAIMessageSchema,
} from "./types";
