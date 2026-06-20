#!/usr/bin/env node
/**
 * Embedding-Aware Agent
 *
 * Extends base agent with semantic code search capability.
 * Searches journal index before executing commands.
 */

import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { promisify } from "util";

// Import unified embedding service
import {
  AdaptiveRetrievalContext,
  embeddingService,
  SearchResult,
} from "../models/embeddings.js";

const execAsync = promisify(exec);

// Re-export for backward compatibility
interface CodeContext {
  text: string;
  path: string;
  similarity: number;
}

/**
 * Semantic search using unified embedding service
 * Supports multiple models (MiniLM, Gemma3n) with adaptive selection
 */
async function semanticSearch(
  query: string,
  options: {
    modelKey?: string;
    useAdaptive?: boolean;
    context?: AdaptiveRetrievalContext;
  } = {}
): Promise<CodeContext[]> {
  const { modelKey = "minilm", useAdaptive = false, context = {} } = options;

  console.log(`🔍 Searching embeddings for: "${query}"`);

  try {
    // Check if journal index exists
    const journalPath = path.join(
      process.cwd(),
      "../../../.code-index-journal"
    );
    if (!fs.existsSync(journalPath)) {
      console.log(
        "⚠️  No journal index found. Run: npm run journal-code-index"
      );
      return [];
    }

    // Use adaptive retrieval or specific model
    let results: SearchResult[];

    if (useAdaptive) {
      console.log("✨ Using adaptive model selection...");
      results = await embeddingService.adaptiveRetrieval(
        query,
        context,
        journalPath
      );
    } else {
      console.log(`🤖 Using ${modelKey} model...`);
      await embeddingService.initialize(modelKey);
      const queryEmbedding = await embeddingService.generateEmbedding(
        query,
        modelKey
      );
      results = await embeddingService["searchCodeIndex"](
        queryEmbedding,
        journalPath,
        modelKey
      );
    }

    // Convert to CodeContext format
    return results.map((r) => ({
      text: r.text,
      path: r.path,
      similarity: r.similarity,
    }));
  } catch (error) {
    console.error("❌ Embedding search failed:", error);
    return [];
  }
}

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

async function callClaude(
  userMessage: string,
  searchOptions: {
    modelKey?: string;
    useAdaptive?: boolean;
    previousQueries?: string[];
  } = {}
): Promise<string> {
  if (userMessage) {
    // Extract search configuration
    const {
      modelKey,
      useAdaptive = true,
      previousQueries = [],
    } = searchOptions;

    // Build adaptive context
    const context: AdaptiveRetrievalContext = {
      previousQueries,
      userProfile: {
        role: "developer",
        expertise: "intermediate",
      },
    };

    // Search embeddings before sending to Claude
    const contexts = await semanticSearch(userMessage, {
      modelKey,
      useAdaptive,
      context,
    });

    let enhancedMessage = userMessage;
    if (contexts.length > 0) {
      const contextStr = contexts
        .map(
          (c) =>
            `[${c.path}] (similarity: ${c.similarity.toFixed(2)})\n${c.text}`
        )
        .join("\n\n");

      enhancedMessage = `${userMessage}\n\nRelevant code patterns from codebase:\n${contextStr}`;
      console.log(`✨ Found ${contexts.length} similar patterns\n`);
    }

    conversation.push({ role: "user", content: enhancedMessage });
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: conversation,
    system:
      "You are a coding assistant with access to semantic code search. Use the bash tool and reference provided code patterns when helping with tasks.",
    tools: [
      {
        name: "bash",
        description: "Execute bash commands",
        input_schema: {
          type: "object" as const,
          properties: {
            command: { type: "string" },
          },
          required: ["command"],
        },
      },
    ],
  });

  conversation.push({ role: "assistant", content: response.content });

  for (const content of response.content) {
    if (content.type === "tool_use" && content.name === "bash") {
      const { command } = content.input as { command: string };
      console.log(`\n🔧 Running: ${command}`);

      let output: string;
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          maxBuffer: 10485760,
        });
        output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");
      } catch (error) {
        const err = error as {
          message: string;
          stdout?: string;
          stderr?: string;
        };
        output = `Error: ${err.message}\n${err.stdout || ""}\n${
          err.stderr || ""
        }`;
      }

      console.log(output);

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

      return callClaude("");
    }
  }

  return (
    response.content.find((content) => content.type === "text")?.text || ""
  );
}

async function main() {
  console.log("🧠 Embedding-Aware Agent started");
  console.log("✨ Semantic code search enabled");
  console.log("🤖 Models: MiniLM (fast) | Gemma3n (advanced)");
  console.log("🎯 Adaptive model selection: enabled");
  console.log('💡 Type "exit" to quit\n');

  // Initialize default model
  try {
    await embeddingService.initialize("minilm");
    console.log("✅ MiniLM model initialized\n");
  } catch (error) {
    console.error("⚠️  Model initialization failed:", error);
  }

  const prompt = () =>
    new Promise<string>((resolve) => rl.question("> ", resolve));

  const queryHistory: string[] = [];

  while (true) {
    const input = await prompt();

    if (input.toLowerCase() === "exit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      break;
    }

    if (input.trim()) {
      try {
        // Pass query history for adaptive context
        const response = await callClaude(input, {
          useAdaptive: true,
          previousQueries: queryHistory.slice(-3), // Last 3 queries
        });

        // Store query for context
        queryHistory.push(input);

        console.log(`\n${response}\n`);
      } catch (error) {
        const err = error as { message: string };
        console.error(`\n❌ Error: ${err.message}\n`);
      }
    }
  }
}

main().catch(console.error);
