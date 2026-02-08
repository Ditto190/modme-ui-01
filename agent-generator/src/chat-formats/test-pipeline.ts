#!/usr/bin/env tsx
/**
 * test-pipeline.ts
 *
 * End-to-end test for the Universal Chat Ingestion pipeline.
 *
 * Tests:
 *   1. Format detection against real Copilot chat.json
 *   2. Normalization → UniversalTurnPayload
 *   3. Discovery step for unknown formats (simulated)
 *   4. Sample file generation
 *
 * Usage:
 *   npx tsx src/chat-formats/test-pipeline.ts
 *   npx tsx src/chat-formats/test-pipeline.ts path/to/chat.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detect, ingest, diagnose, listFormats, initializeRegistry } from './index.js';

// ============================================================================
// CONFIG
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CHAT_PATH = join(__dirname, '..', '..', '..', 'datasets', 'chat.json');
const UNKNOWN_FORMATS_DIR = join(__dirname, '..', '..', '..', 'datasets', 'unknown-formats');

// ============================================================================
// TEST HELPERS
// ============================================================================

function hr(label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}\n`);
}

function pass(msg: string) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function info(msg: string) { console.log(`  \x1b[36mℹ\x1b[0m ${msg}`); }
function warn(msg: string) { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    pass(label);
    passed++;
  } else {
    fail(`${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ============================================================================
// TEST 1: Registry initialization
// ============================================================================

function testRegistry() {
  hr('TEST 1: Registry & Format Listing');

  initializeRegistry();
  const formats = listFormats();

  assert(formats.length > 0, `Registry has ${formats.length} format(s)`);

  for (const fmt of formats) {
    info(`  ${fmt.id}: ${fmt.name} (agent: ${fmt.agent}, priority: ${fmt.priority}, rules: ${fmt.fingerprintRules})`);
  }

  assert(
    formats.some((f) => f.id === 'copilot-chat'),
    'Copilot Chat format is registered'
  );
}

// ============================================================================
// TEST 2: Detection against real Copilot chat.json
// ============================================================================

function testDetection(data: any) {
  hr('TEST 2: Format Detection');

  const result = detect(data);

  assert(result.matched === true, 'Format detected successfully');
  assert(result.formatId === 'copilot-chat', `Format ID = "${result.formatId}"`);
  assert(result.confidence === 'exact', `Confidence = "${result.confidence}"`);

  if (result.ruleResults.length > 0) {
    info('Fingerprint rule results:');
    for (const rr of result.ruleResults) {
      const icon = rr.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      info(`  ${icon} ${rr.rule.path} [${rr.rule.check}]`);
    }
  }
}

// ============================================================================
// TEST 3: Full ingestion (detect + normalize)
// ============================================================================

function testIngestion(data: any) {
  hr('TEST 3: Full Ingestion Pipeline');

  const result = ingest(data, 'test-pipeline');

  assert(result.success === true, 'Ingestion succeeded');
  assert(result.detection.matched === true, 'Detection step passed');

  if (result.payload) {
    assert(result.payload.format === 'copilot-chat', `Payload format = "${result.payload.format}"`);
    assert(result.payload.agent === 'GitHub Copilot', `Payload agent = "${result.payload.agent}"`);
    assert(result.payload.projectName === 'test-pipeline', `Project name = "${result.payload.projectName}"`);
    assert(result.payload.turns.length > 0, `Extracted ${result.payload.turns.length} turn(s)`);

    info(`Stats: ${JSON.stringify(result.stats)}`);

    // Inspect first turn
    const first = result.payload.turns[0];
    info(`First turn:`);
    info(`  User: ${first.userMessage.slice(0, 80)}...`);
    info(`  Assistant: ${first.assistantResponse.slice(0, 80)}...`);
    info(`  Model: ${first.model}`);
    info(`  Tool calls: ${first.toolCalls.length}`);
    info(`  Has thinking: ${!!first.thinking}`);

    if (first.tokens) {
      info(`  Tokens: prompt=${first.tokens.prompt}, completion=${first.tokens.completion}`);
    }

    // Check tool calls from any turn
    const totalToolCalls = result.payload.turns.reduce((sum, t) => sum + t.toolCalls.length, 0);
    assert(totalToolCalls > 0, `Total tool calls across all turns: ${totalToolCalls}`);

    // Check for thinking blocks
    const turnsWithThinking = result.payload.turns.filter((t) => t.thinking);
    info(`Turns with thinking/CoT: ${turnsWithThinking.length}/${result.payload.turns.length}`);
  } else {
    fail('Payload is null');
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        warn(`Error: ${err.slice(0, 200)}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    info(`Warnings (${result.warnings.length}):`);
    for (const w of result.warnings.slice(0, 5)) {
      warn(w);
    }
    if (result.warnings.length > 5) {
      warn(`... and ${result.warnings.length - 5} more`);
    }
  }
}

// ============================================================================
// TEST 4: Discovery step (simulate unknown format)
// ============================================================================

function testDiscovery() {
  hr('TEST 4: Discovery Step (Unknown Format)');

  // Create a fake "unknown" chat format to trigger discovery
  const fakeChat = {
    version: '2.0',
    metadata: { app: 'SomeNewAgent', exportDate: '2025-01-15' },
    conversation: [
      {
        role: 'user',
        content: 'Hello, can you help me with TypeScript?',
        timestamp: 1705334400000,
      },
      {
        role: 'assistant',
        content: 'Of course! TypeScript is a typed superset of JavaScript...',
        timestamp: 1705334405000,
        model: 'gpt-4o',
        usage: { promptTokens: 15, completionTokens: 120 },
      },
    ],
  };

  const result = ingest(fakeChat, 'test-discovery', 'fake-agent-export');

  assert(result.success === false, 'Ingestion correctly fails for unknown format');
  assert(result.detection.matched === false, 'Detection correctly reports no match');
  assert(result.detection.confidence !== 'exact', `Confidence = "${result.detection.confidence}" (not exact)`);

  // Check discovery was generated
  assert(!!result.discovery, 'Discovery sample was generated');

  if (result.discovery?.sampled) {
    const sample = result.discovery.sample!;
    assert(!!sample.topLevelSchema, 'Top-level schema captured');
    assert(!!sample.candidateTurnsPath, `Candidate turns path = "${sample.candidateTurnsPath}"`);
    assert(sample.candidateTurnsCount === 2, `Candidate turns count = ${sample.candidateTurnsCount}`);
    assert(sample.deepKeyMap.length > 0, `Deep key map has ${sample.deepKeyMap.length} entries`);
    assert(!!sample.firstTurnSample, 'First turn sample captured');

    info('Discovered top-level schema:');
    for (const [key, type] of Object.entries(sample.topLevelSchema)) {
      info(`  ${key}: ${type}`);
    }

    if (sample.firstTurnSchema) {
      info('First turn schema:');
      for (const [key, type] of Object.entries(sample.firstTurnSchema)) {
        info(`  ${key}: ${type}`);
      }
    }

    // === SAVE THE SAMPLE TO DISK ===
    if (!existsSync(UNKNOWN_FORMATS_DIR)) {
      mkdirSync(UNKNOWN_FORMATS_DIR, { recursive: true });
      info(`Created discovery directory: ${UNKNOWN_FORMATS_DIR}`);
    }

    const samplePath = join(UNKNOWN_FORMATS_DIR, result.discovery.suggestedFilename);
    writeFileSync(samplePath, result.discovery.sampleJson, 'utf-8');
    pass(`Saved discovery sample → ${samplePath}`);

    info(`Suggested filename: ${result.discovery.suggestedFilename}`);
    info(`Content hash: ${sample.contentHash}`);
  } else {
    fail('Discovery sampling failed');
    if (result.discovery?.errors) {
      for (const err of result.discovery.errors) {
        warn(err);
      }
    }
  }
}

// ============================================================================
// TEST 5: Diagnostic output for failed detection
// ============================================================================

function testDiagnostic() {
  hr('TEST 5: Diagnostic Output');

  const fakeChat = {
    messages: [
      { sender: 'human', text: 'Test message' },
      { sender: 'bot', text: 'Test response' },
    ],
  };

  const diagnostic = diagnose(fakeChat);
  assert(diagnostic.includes('Chat Format Detection Diagnostic'), 'Diagnostic header present');
  assert(diagnostic.includes('Top-level structure'), 'Top-level structure section present');
  assert(diagnostic.includes('copilot-chat'), 'Lists registered formats');

  info('Diagnostic output (first 400 chars):');
  console.log(diagnostic.slice(0, 400));
}

// ============================================================================
// TEST 6: Bridge payload shape validation
// ============================================================================

function testPayloadShape(data: any) {
  hr('TEST 6: Bridge Payload Shape');

  const result = ingest(data, 'test-pipeline');
  if (!result.payload) {
    fail('No payload to validate');
    return;
  }

  const p = result.payload;

  // Validate shape matches what the Python bridge /ingest expects
  assert(typeof p.format === 'string', 'payload.format is string');
  assert(typeof p.agent === 'string', 'payload.agent is string');
  assert(typeof p.projectName === 'string', 'payload.projectName is string');
  assert(Array.isArray(p.turns), 'payload.turns is array');

  // Validate turn shape
  const turn = p.turns[0];
  assert(typeof turn.index === 'number', 'turn.index is number');
  assert(typeof turn.userMessage === 'string', 'turn.userMessage is string');
  assert(typeof turn.assistantResponse === 'string', 'turn.assistantResponse is string');
  assert(typeof turn.model === 'string', 'turn.model is string');
  assert(Array.isArray(turn.toolCalls), 'turn.toolCalls is array');

  if (turn.toolCalls.length > 0) {
    const tc = turn.toolCalls[0];
    assert(typeof tc.name === 'string', `toolCall.name = "${tc.name}"`);
    assert(tc.input === undefined || typeof tc.input === 'string', 'toolCall.input is string|undefined');
    assert(tc.output === undefined || typeof tc.output === 'string', 'toolCall.output is string|undefined');
  }

  // Estimate payload size for the bridge
  const payloadJson = JSON.stringify(p);
  info(`Payload size: ${(payloadJson.length / 1024).toFixed(1)} KB`);
  info(`Turns: ${p.turns.length}`);
  info(`Total tool calls: ${p.turns.reduce((s, t) => s + t.toolCalls.length, 0)}`);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const chatPath = process.argv[2] || DEFAULT_CHAT_PATH;

  console.log('\n\x1b[1m🔬 Universal Chat Ingestion Pipeline — End-to-End Test\x1b[0m');
  console.log(`Chat file: ${chatPath}`);

  // Load chat data
  let chatData: any;
  try {
    const raw = readFileSync(chatPath, 'utf-8');
    chatData = JSON.parse(raw);
    info(`Loaded ${(raw.length / 1024).toFixed(0)} KB of chat data`);
  } catch (err) {
    fail(`Failed to load chat file: ${err}`);
    process.exit(1);
  }

  // Run tests
  testRegistry();
  testDetection(chatData);
  testIngestion(chatData);
  testDiscovery();
  testDiagnostic();
  testPayloadShape(chatData);

  // Summary
  hr('RESULTS');
  console.log(`  \x1b[32m${passed} passed\x1b[0m`);
  if (failed > 0) {
    console.log(`  \x1b[31m${failed} failed\x1b[0m`);
  }
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main();
