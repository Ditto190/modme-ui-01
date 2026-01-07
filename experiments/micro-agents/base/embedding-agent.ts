#!/usr/bin/env node
/**
 * Embedding-Aware Agent
 * 
 * Extends base agent with semantic code search capability.
 * Searches journal index before executing commands.
 */

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Mock embedding service (will integrate with actual service)
interface CodeContext {
  text: string;
  path: string;
  similarity: number;
}

async function semanticSearch(query: string): Promise<CodeContext[]> {
  // TODO: Integrate with scripts/knowledge-management/embeddings/embeddings.ts
  // For now, return mock results
  console.log(`🔍 Searching embeddings for: "${query}"`);
  
  try {
    // Check if journal index exists
    const journalPath = path.join(process.cwd(), '../../../.code-index-journal');
    if (!fs.existsSync(journalPath)) {
      console.log('⚠️  No journal index found. Run: npm run journal-code-index');
      return [];
    }
    
    // Mock results - will be replaced with actual embedding search
    return [
      {
        text: '// Example: Similar code pattern found\nexport function authenticate(req, res, next) {\n  // ...\n}',
        path: 'src/middleware/auth.ts',
        similarity: 0.87
      }
    ];
  } catch (error) {
    console.error('❌ Embedding search failed:', error);
    return [];
  }
}

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

async function callClaude(userMessage: string): Promise<string> {
  if (userMessage) {
    // Search embeddings before sending to Claude
    const contexts = await semanticSearch(userMessage);
    
    let enhancedMessage = userMessage;
    if (contexts.length > 0) {
      const contextStr = contexts.map(c => 
        `[${c.path}] (similarity: ${c.similarity.toFixed(2)})\n${c.text}`
      ).join('\n\n');
      
      enhancedMessage = `${userMessage}\n\nRelevant code patterns from codebase:\n${contextStr}`;
      console.log(`✨ Found ${contexts.length} similar patterns\n`);
    }
    
    conversation.push({ role: 'user', content: enhancedMessage });
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: conversation,
    system: 'You are a coding assistant with access to semantic code search. Use the bash tool and reference provided code patterns when helping with tasks.',
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

  conversation.push({ role: 'assistant', content: response.content });

  for (const content of response.content) {
    if (content.type === 'tool_use' && content.name === 'bash') {
      const { command } = content.input as { command: string };
      console.log(`\n🔧 Running: ${command}`);

      let output: string;
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          maxBuffer: 10485760
        });
        output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
      } catch (error) {
        const err = error as { message: string; stdout?: string; stderr?: string };
        output = `Error: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`;
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

      return callClaude('');
    }
  }

  return response.content.find(content => content.type === 'text')?.text || '';
}

async function main() {
  console.log('🧠 Embedding-Aware Agent started');
  console.log('✨ Semantic code search enabled');
  console.log('💡 Type "exit" to quit\n');

  const prompt = () => new Promise<string>(resolve => rl.question('> ', resolve));

  while (true) {
    const input = await prompt();

    if (input.toLowerCase() === 'exit') {
      console.log('\n👋 Goodbye!');
      rl.close();
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
