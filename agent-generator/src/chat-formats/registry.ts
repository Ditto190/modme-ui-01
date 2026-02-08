/**
 * chat-formats/registry.ts
 *
 * Static registry of all known chat format descriptors.
 *
 * New formats are added here by:
 *   1. AI analyzes a sample chat export (offline)
 *   2. Generates a ChatFormatDescriptor + custom extractors
 *   3. Developer commits the new format file + adds to registry
 *   4. Pipeline picks it up on next run — zero LLM calls at runtime
 */

import type { ChatFormatRegistry, ChatFormatDescriptor, DetectionResult, NormalizationResult } from './types';
import { detectFormat, generateDiagnostic } from './fingerprint';
import { normalize } from './normalizer';
import { generateDiscoverySample, type DiscoveryResult } from './discovery';

// Import format descriptors
import { copilotChatDescriptor, registerCopilotFormat } from './formats/copilot-chat';

// ============================================================================
// REGISTRY DEFINITION
// ============================================================================

/**
 * The canonical registry of all known chat formats.
 *
 * Add new formats here as they are created:
 *   1. Create formats/{agent-name}.ts with descriptor + extractors
 *   2. Import and add to the formats array below
 *   3. Call the register function in initializeRegistry()
 */
export const chatFormatRegistry: ChatFormatRegistry = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  formats: [
    copilotChatDescriptor,
    // Future formats:
    // claudeCodeDescriptor,
    // claudeWebDescriptor,
    // chatgptDescriptor,
    // cursorDescriptor,
  ],
};

// ============================================================================
// INITIALIZATION — registers all custom extractors
// ============================================================================

let initialized = false;

/**
 * Initialize the registry by registering all format-specific extractors.
 * Must be called once before using detect() or ingest().
 */
export function initializeRegistry(): void {
  if (initialized) return;

  registerCopilotFormat();
  // Future: registerClaudeCodeFormat();
  // Future: registerClaudeWebFormat();

  initialized = true;
}

// ============================================================================
// HIGH-LEVEL API — the interface n8n and the bridge use
// ============================================================================

/**
 * Detect which chat format the data matches.
 */
export function detect(data: any): DetectionResult {
  initializeRegistry();
  return detectFormat(data, chatFormatRegistry);
}

/**
 * Detect + normalize in one call.
 * This is the main entry point for the pipeline.
 *
 * When detection fails, automatically generates a discovery sample
 * that can be saved for offline analysis by the schema-crawler.
 */
export function ingest(
  data: any,
  projectName?: string,
  sourceLabel?: string
): NormalizationResult & { detection: DetectionResult; discovery?: DiscoveryResult } {
  initializeRegistry();

  const detection = detectFormat(data, chatFormatRegistry);

  if (!detection.matched || !detection.descriptor) {
    const diagnostic = generateDiagnostic(data, chatFormatRegistry);

    // === DISCOVERY STEP ===
    // When detection fails, generate a structural sample for offline analysis.
    // This is the feedback loop: pipeline fails → sample saved → AI generates descriptor.
    const discovery = generateDiscoverySample(
      data,
      diagnostic,
      sourceLabel || 'unknown'
    );

    return {
      success: false,
      payload: null,
      errors: [
        `No matching format found. Discovery sample generated for offline analysis.`,
        diagnostic,
      ],
      warnings: discovery.errors,
      stats: { totalTurns: 0, extractedTurns: 0, skippedTurns: 0, toolCallsFound: 0 },
      detection,
      discovery,
    };
  }

  const normResult = normalize(data, detection.descriptor, projectName);
  return { ...normResult, detection };
}

/**
 * Get a diagnostic report for data that fails detection.
 * Useful for AI to analyze and generate a new format descriptor.
 */
export function diagnose(data: any): string {
  initializeRegistry();
  return generateDiagnostic(data, chatFormatRegistry);
}

/**
 * List all registered formats and their status.
 */
export function listFormats(): Array<{
  id: string;
  name: string;
  agent: string;
  status: string;
  priority: number;
  fingerprintRules: number;
}> {
  return chatFormatRegistry.formats.map((f) => ({
    id: f.id,
    name: f.name,
    agent: f.agent,
    status: f.status,
    priority: f.priority,
    fingerprintRules: f.fingerprint.length,
  }));
}
