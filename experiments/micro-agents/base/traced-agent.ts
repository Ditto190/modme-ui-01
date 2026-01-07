#!/usr/bin/env node
/**
 * Traced Agent with OpenTelemetry
 * 
 * Extends base agent with OTLP tracing for observability.
 * Traces: user messages, tool calls, responses, errors.
 */

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const execAsync = promisify(exec);

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'micro-agent-traced',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();
console.log('📊 OpenTelemetry tracing initialized (localhost:4318)');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_KEY || (() => {
    console.error('❌ ANTHROPIC_KEY environment variable required');
    process.exit(1);
  })()
});

const conversation: Anthropic.MessageParam[] = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const tracer = trace.getTracer('micro-agent');

async function callClaude(userMessage: string): Promise<string> {
  return tracer.startActiveSpan('claude-interaction', async (span) => {
    try {
      if (userMessage) {
        span.setAttribute('user.message', userMessage);
        span.setAttribute('conversation.length', conversation.length);
        conversation.push({ role: 'user', content: userMessage });
      }

      const response = await tracer.startActiveSpan('anthropic.messages.create', async (apiSpan) => {
        apiSpan.setAttribute('model', 'claude-sonnet-4-20250514');
        apiSpan.setAttribute('max_tokens', 4000);
        
        try {
          const result = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: conversation,
            system: 'You are a helpful coding assistant with tracing enabled.',
            tools: [{
              name: 'bash',
              description: 'Execute bash commands',
              input_schema: {
                type: 'object' as const,
                properties: {
                  command: { type: 'string' }
                },
                required: ['command']
              }
            }]
          });
          
          apiSpan.setStatus({ code: SpanStatusCode.OK });
          apiSpan.setAttribute('response.content_blocks', result.content.length);
          return result;
        } catch (error) {
          apiSpan.recordException(error as Error);
          apiSpan.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          apiSpan.end();
        }
      });

      conversation.push({ role: 'assistant', content: response.content });

      // Process tool calls
      for (const content of response.content) {
        if (content.type === 'tool_use' && content.name === 'bash') {
          const { command } = content.input as { command: string };
          
          await tracer.startActiveSpan('tool.bash', async (toolSpan) => {
            toolSpan.setAttribute('tool.name', 'bash');
            toolSpan.setAttribute('tool.command', command);
            console.log(`\n🔧 Running: ${command}`);

            let output: string;
            try {
              const { stdout, stderr } = await execAsync(command, {
                cwd: process.cwd(),
                maxBuffer: 10485760
              });
              output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
              toolSpan.setStatus({ code: SpanStatusCode.OK });
              toolSpan.setAttribute('tool.output_length', output.length);
            } catch (error) {
              const err = error as { message: string; stdout?: string; stderr?: string };
              output = `Error: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`;
              toolSpan.recordException(err as Error);
              toolSpan.setStatus({ code: SpanStatusCode.ERROR });
              toolSpan.setAttribute('tool.error', err.message);
            } finally {
              toolSpan.end();
            }

            console.log(output);

            conversation.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: content.id,
                content: output
              }]
            });

            span.end();
            return callClaude('');
          });
        }
      }

      const textResponse = response.content.find(content => content.type === 'text')?.text || '';
      span.setAttribute('response.length', textResponse.length);
      span.setStatus({ code: SpanStatusCode.OK });
      return textResponse;

    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

async function main() {
  console.log('📊 Traced Agent started (OpenTelemetry enabled)');
  console.log('🔍 View traces: AI Toolkit → Tracing tab');
  console.log('💡 Type "exit" to quit\n');

  const prompt = () => new Promise<string>(resolve => rl.question('> ', resolve));

  while (true) {
    const input = await prompt();

    if (input.toLowerCase() === 'exit') {
      console.log('\n👋 Shutting down...');
      rl.close();
      await sdk.shutdown();
      break;
    }

    if (input.trim()) {
      try {
        const response = await callClaude(input);
        console.log(`\n${response}\n`);
      } catch (error) {
        const err = error as { message: string };
        console.error(`\n❌ Error: ${err.message}\n`);
      }
    }
  }
}

main().catch(console.error);
