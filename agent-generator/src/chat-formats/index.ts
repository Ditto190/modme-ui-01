/**
 * chat-formats/index.ts
 *
 * Universal Chat Ingestion Pipeline — public API.
 *
 * Usage:
 *   import { ingest, detect, diagnose, listFormats } from './chat-formats';
 *
 *   const result = ingest(chatJsonData, 'my-phoenix-project');
 *   if (result.success) {
 *     // POST result.payload to bridge /ingest
 *   } else {
 *     console.error(result.errors);
 *     console.log(diagnose(chatJsonData)); // AI can use this to build new descriptor
 *   }
 */

// High-level API
export { detect, diagnose, ingest, initializeRegistry, listFormats } from "./registry";

// Types (for format authors and consumers)
export type {
  ChatFormatDescriptor,
  ChatFormatRegistry,
  DetectionResult,
  FieldMapping,
  FieldPath,
  FingerprintRule,
  NormalizationResult,
  TokenUsage,
  ToolCall,
  UniversalTurn,
  UniversalTurnPayload,
} from "./types";

// Schemas (for Zod validation)
export {
  ChatFormatDescriptorSchema,
  ChatFormatRegistrySchema,
  FieldMappingSchema,
  FingerprintRuleSchema,
  TokenUsageSchema,
  ToolCallSchema,
  UniversalTurnPayloadSchema,
  UniversalTurnSchema,
} from "./types";

// Discovery (for unknown format handling)
export { generateDiscoverySample } from "./discovery";
export type { DiscoveryResult, StructuralSample } from "./discovery";

// Utilities (for format descriptor authors)
export { evaluateRule, getByPath, matchFormat } from "./fingerprint";
export {
  registerResponseAssembler,
  registerThinkingExtractor,
  registerToolCallExtractor,
} from "./normalizer";

// OpenAPI spec generation
export { generateAndSaveSpec, generateOpenApiDocument } from "./openapi";

// Format descriptors (for direct access)
export { copilotChatDescriptor } from "./formats/copilot-chat";
