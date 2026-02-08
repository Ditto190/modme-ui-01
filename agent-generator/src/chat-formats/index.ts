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
export { detect, ingest, diagnose, listFormats, initializeRegistry } from './registry';

// Types (for format authors and consumers)
export type {
  ChatFormatDescriptor,
  ChatFormatRegistry,
  FieldMapping,
  FieldPath,
  FingerprintRule,
  UniversalTurn,
  UniversalTurnPayload,
  TokenUsage,
  ToolCall,
  DetectionResult,
  NormalizationResult,
} from './types';

// Schemas (for Zod validation)
export {
  UniversalTurnSchema,
  UniversalTurnPayloadSchema,
  ToolCallSchema,
  TokenUsageSchema,
  ChatFormatDescriptorSchema,
  FingerprintRuleSchema,
  FieldMappingSchema,
  ChatFormatRegistrySchema,
} from './types';

// Discovery (for unknown format handling)
export { generateDiscoverySample } from './discovery';
export type { StructuralSample, DiscoveryResult } from './discovery';

// Utilities (for format descriptor authors)
export { getByPath, evaluateRule, matchFormat } from './fingerprint';
export {
  registerResponseAssembler,
  registerThinkingExtractor,
  registerToolCallExtractor,
} from './normalizer';

// Format descriptors (for direct access)
export { copilotChatDescriptor } from './formats/copilot-chat';
