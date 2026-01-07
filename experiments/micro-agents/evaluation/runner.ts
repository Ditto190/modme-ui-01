/**
 * Evaluation Runner
 * 
 * Executes agents with test queries and collects responses for evaluation.
 * Based on AI Toolkit evaluation best practices.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Query {
  id: string;
  query: string;
  context: Record<string, unknown>;
}

interface Response {
  query_id: string;
  input: string;
  output: string;
  tool_calls: string[];
  timestamp: string;
  duration_ms: number;
}

interface ExpectedResponse {
  query_id: string;
  expected: {
    tool_calls: string[];
    command_contains?: string[];
    success: boolean;
    output_contains?: string[];
    file_created?: string;
    file_contains?: string;
    output_is_number?: boolean;
  };
}

/**
 * Load test queries
 */
function loadQueries(): Query[] {
  const queriesPath = path.join(__dirname, 'queries.json');
  return JSON.parse(fs.readFileSync(queriesPath, 'utf-8'));
}

/**
 * Load expected responses
 */
function loadExpectedResponses(): ExpectedResponse[] {
  const expectedPath = path.join(__dirname, 'expected-responses.json');
  return JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
}

/**
 * Run agent with query (mock - will be replaced with actual agent execution)
 */
async function runAgent(query: string): Promise<{ output: string; tool_calls: string[]; duration_ms: number }> {
  const startTime = Date.now();
  
  // TODO: Replace with actual agent execution
  // For now, return mock response
  const mockOutput = `Executed query: ${query}`;
  const mockToolCalls = ['bash'];
  
  const duration_ms = Date.now() - startTime;
  
  return {
    output: mockOutput,
    tool_calls: mockToolCalls,
    duration_ms
  };
}

/**
 * Evaluate response against expected
 */
function evaluateResponse(response: Response, expected: ExpectedResponse): {
  passed: boolean;
  metrics: Record<string, boolean>;
} {
  const metrics: Record<string, boolean> = {};
  
  // Check tool calls
  metrics.tool_calls_correct = expected.expected.tool_calls.every(tool =>
    response.tool_calls.includes(tool)
  );
  
  // Check command contains
  if (expected.expected.command_contains) {
    metrics.command_contains = expected.expected.command_contains.every(part =>
      response.output.toLowerCase().includes(part.toLowerCase())
    );
  }
  
  // Check output contains
  if (expected.expected.output_contains) {
    metrics.output_contains = expected.expected.output_contains.every(part =>
      response.output.toLowerCase().includes(part.toLowerCase())
    );
  }
  
  // Check file created
  if (expected.expected.file_created) {
    metrics.file_created = fs.existsSync(expected.expected.file_created);
    
    if (metrics.file_created && expected.expected.file_contains) {
      const content = fs.readFileSync(expected.expected.file_created, 'utf-8');
      metrics.file_contains = content.includes(expected.expected.file_contains);
    }
  }
  
  // Check if output is number
  if (expected.expected.output_is_number) {
    metrics.output_is_number = !isNaN(parseInt(response.output.trim()));
  }
  
  const passed = Object.values(metrics).every(v => v);
  
  return { passed, metrics };
}

/**
 * Main evaluation runner
 */
async function main() {
  console.log('🚀 Starting Evaluation Runner\n');
  
  const queries = loadQueries();
  const expectedResponses = loadExpectedResponses();
  const responses: Response[] = [];
  
  console.log(`📋 Loaded ${queries.length} test queries\n`);
  
  // Run agent with each query
  for (const query of queries) {
    console.log(`🔄 Processing query ${query.id}: "${query.query}"`);
    
    const { output, tool_calls, duration_ms } = await runAgent(query.query);
    
    const response: Response = {
      query_id: query.id,
      input: query.query,
      output,
      tool_calls,
      timestamp: new Date().toISOString(),
      duration_ms
    };
    
    responses.push(response);
    console.log(`  ✓ Completed in ${duration_ms}ms\n`);
  }
  
  // Save responses
  const responsesPath = path.join(__dirname, 'responses.json');
  fs.writeFileSync(responsesPath, JSON.stringify(responses, null, 2));
  console.log(`💾 Saved ${responses.length} responses to ${responsesPath}\n`);
  
  // Evaluate responses
  console.log('📊 Evaluating Responses\n');
  
  let passedCount = 0;
  const results: Array<{ query_id: string; passed: boolean; metrics: Record<string, boolean> }> = [];
  
  for (const response of responses) {
    const expected = expectedResponses.find(e => e.query_id === response.query_id);
    if (!expected) {
      console.log(`⚠️  No expected response for query ${response.query_id}`);
      continue;
    }
    
    const { passed, metrics } = evaluateResponse(response, expected);
    
    results.push({
      query_id: response.query_id,
      passed,
      metrics
    });
    
    if (passed) {
      passedCount++;
      console.log(`✅ ${response.query_id}: PASSED`);
    } else {
      console.log(`❌ ${response.query_id}: FAILED`);
      console.log(`   Metrics:`, metrics);
    }
  }
  
  // Save evaluation results
  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved evaluation results to ${resultsPath}`);
  
  // Summary
  const accuracy = (passedCount / queries.length) * 100;
  console.log(`\n📈 Evaluation Summary`);
  console.log(`   Total Queries: ${queries.length}`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${queries.length - passedCount}`);
  console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
  
  if (accuracy === 100) {
    console.log(`\n🎉 All tests passed!`);
  } else {
    console.log(`\n⚠️  Some tests failed. Review results.json for details.`);
  }
}

main().catch(console.error);
