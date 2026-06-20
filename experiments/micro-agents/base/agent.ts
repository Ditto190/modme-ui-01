#!/usr/bin/env node
/**
 * Base Agent - Smallest Agent Foundation
 *
 * Minimal coding agent with bash execution and conversation history.
 * Based on: https://github.com/obra/smallest-agent
 */

import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import * as readline from "readline";
import { promisify } from "util";

const execAsync = promisify(exec);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey:
    process.env.ANTHROPIC_KEY ||
    (() => {
      console.error("❌ ANTHROPIC_KEY environment variable required");
      process.exit(1);
    })(),
});

const conversation: Anthropic.MessageParam[] = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Call Claude with conversation history and tool support
 */
async function callClaude(userMessage: string): Promise<string> {
  if (userMessage) {
    conversation.push({ role: "user", content: userMessage });
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: conversation,
    system:
      "You are a helpful coding assistant. Use the bash tool to help with programming tasks. Be concise and practical.",
    tools: [
      {
        name: "bash",
        description:
          "Execute bash commands to read, write, or manipulate files",
        input_schema: {
          type: "object" as const,
          properties: {
            command: {
              type: "string",
              description: "The bash command to execute",
            },
          },
          required: ["command"],
        },
      },
    ],
  });

  conversation.push({ role: "assistant", content: response.content });

  // Process tool calls
  for (const content of response.content) {
    if (content.type === "tool_use" && content.name === "bash") {
      const { command } = content.input as { command: string };
      console.log(`\n🔧 Running: ${command}`);

      let output: string;
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          maxBuffer: 10485760, // 10 MB buffer
        });
        output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");
      } catch (error: any) {
        output = `Error: ${error.message}\n${error.stdout || ""}\n${
          error.stderr || ""
        }`;
      }

      console.log(output);

      // Send tool result back
      conversation.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: content.id,
            content: output,
          },
        ],
      });

      return callClaude(""); // Continue conversation
    }
  }

  // Return text response
  return (
    response.content.find((content) => content.type === "text")?.text || ""
  );
}

/**
 * Main REPL loop
 */
async function main() {
  console.log("🤖 Base Agent started (smallest-agent foundation)");
  console.log('💡 Type "exit" to quit\n');

  const prompt = () =>
    new Promise<string>((resolve) => rl.question("> ", resolve));

  while (true) {
    const input = await prompt();

    if (input.toLowerCase() === "exit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      break;
    }

    if (input.trim()) {
      try {
        const response = await callClaude(input);
        console.log(`\n${response}\n`);
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
    }
  }
}

main().catch(console.error);
