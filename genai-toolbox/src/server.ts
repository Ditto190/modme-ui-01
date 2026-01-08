/**
 * MCP Server with LLM Sampling and OpenTelemetry
 *
 * Features:
 * - Tool registration with LLM sampling capabilities
 * - OpenTelemetry distributed tracing
 * - Stdio transport for MCP communication
 *
 * Run with: pnpm tsx src/server.ts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CreateMessageRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { z } from "zod";
import { initializeTelemetry } from "./telemetry.js";

// Initialize OpenTelemetry (optional - set OTEL_EXPORTER_OTLP_ENDPOINT to enable)
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initializeTelemetry();
}

// Create MCP server
const server = new Server(
  {
    name: "genai-toolbox-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      sampling: {}, // Enable LLM sampling
    },
  }
);

// Tracer for custom spans
const tracer = trace.getTracer("genai-toolbox-mcp", "1.0.0");

/**
 * Tool: Summarize
 * Uses LLM sampling to summarize any text
 */
const SummarizeInputSchema = z.object({
  text: z.string().describe("Text to summarize"),
  max_length: z
    .number()
    .optional()
    .describe("Maximum length of summary (in words)"),
  style: z
    .enum(["concise", "detailed", "bullet-points"])
    .optional()
    .describe("Summary style"),
});

type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

/**
 * Tool: Analyze Sentiment
 * Uses LLM sampling to analyze sentiment of text
 */
const AnalyzeSentimentInputSchema = z.object({
  text: z.string().describe("Text to analyze"),
});

type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

/**
 * Tool: Extract Keywords
 * Uses LLM sampling to extract keywords from text
 */
const ExtractKeywordsInputSchema = z.object({
  text: z.string().describe("Text to extract keywords from"),
  max_keywords: z
    .number()
    .optional()
    .describe("Maximum number of keywords to extract"),
});

type ExtractKeywordsInput = z.infer<typeof ExtractKeywordsInputSchema>;

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const span = tracer.startSpan("list_tools");

  try {
    const tools = [
      {
        name: "summarize",
        description:
          "Summarize any text using an LLM. Supports different styles: concise, detailed, or bullet-points.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to summarize",
            },
            max_length: {
              type: "number",
              description: "Maximum length of summary (in words)",
            },
            style: {
              type: "string",
              enum: ["concise", "detailed", "bullet-points"],
              description: "Summary style",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "analyze_sentiment",
        description:
          "Analyze the sentiment of text (positive, negative, neutral) with confidence score.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to analyze",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "extract_keywords",
        description: "Extract important keywords and phrases from text.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to extract keywords from",
            },
            max_keywords: {
              type: "number",
              description:
                "Maximum number of keywords to extract (default: 10)",
            },
          },
          required: ["text"],
        },
      },
    ];

    span.setAttribute("tools.count", tools.length);
    span.setStatus({ code: SpanStatusCode.OK });

    return { tools };
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const span = tracer.startSpan("call_tool", {
    attributes: {
      "tool.name": request.params.name,
    },
  });

  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "summarize": {
        const input = SummarizeInputSchema.parse(args);
        span.setAttribute("input.text_length", input.text.length);
        span.setAttribute("input.style", input.style || "concise");

        // Build prompt based on style
        let styleInstruction = "";
        if (input.style === "bullet-points") {
          styleInstruction = "Format the summary as bullet points (•). ";
        } else if (input.style === "detailed") {
          styleInstruction =
            "Provide a detailed summary covering all key points. ";
        } else {
          styleInstruction = "Provide a concise summary. ";
        }

        if (input.max_length) {
          styleInstruction += `Limit to approximately ${input.max_length} words.`;
        }

        // Call LLM through MCP sampling
        const response = await server.request(
          {
            method: "sampling/createMessage",
            params: {
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: `${styleInstruction}\n\nText to summarize:\n\n${input.text}`,
                  },
                },
              ],
              maxTokens: 500,
              temperature: 0.3,
            },
          },
          CreateMessageRequestSchema
        );

        span.setAttribute("output.token_count", response.content.length);
        span.setStatus({ code: SpanStatusCode.OK });

        return {
          content: [
            {
              type: "text",
              text:
                response.content.type === "text"
                  ? response.content.text
                  : "Unable to generate summary",
            },
          ],
        };
      }

      case "analyze_sentiment": {
        const input = AnalyzeSentimentInputSchema.parse(args);
        span.setAttribute("input.text_length", input.text.length);

        const response = await server.request(
          {
            method: "sampling/createMessage",
            params: {
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: `Analyze the sentiment of the following text. Respond with ONLY a JSON object in this format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation"
}

Text to analyze:
${input.text}`,
                  },
                },
              ],
              maxTokens: 200,
              temperature: 0.1,
            },
          },
          CreateMessageRequestSchema
        );

        span.setStatus({ code: SpanStatusCode.OK });

        return {
          content: [
            {
              type: "text",
              text:
                response.content.type === "text"
                  ? response.content.text
                  : '{"error": "Unable to analyze sentiment"}',
            },
          ],
        };
      }

      case "extract_keywords": {
        const input = ExtractKeywordsInputSchema.parse(args);
        const maxKeywords = input.max_keywords || 10;
        span.setAttribute("input.text_length", input.text.length);
        span.setAttribute("input.max_keywords", maxKeywords);

        const response = await server.request(
          {
            method: "sampling/createMessage",
            params: {
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: `Extract the top ${maxKeywords} most important keywords and phrases from the following text.
Return ONLY a JSON array of strings, like: ["keyword1", "keyword2", ...]

Text:
${input.text}`,
                  },
                },
              ],
              maxTokens: 300,
              temperature: 0.2,
            },
          },
          CreateMessageRequestSchema
        );

        span.setStatus({ code: SpanStatusCode.OK });

        return {
          content: [
            {
              type: "text",
              text:
                response.content.type === "text" ? response.content.text : "[]",
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP Server] GenAI Toolbox server started");
  console.error(
    "[MCP Server] Tools: summarize, analyze_sentiment, extract_keywords"
  );
  console.error(
    "[MCP Server] OpenTelemetry:",
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? "Enabled" : "Disabled"
  );
}

main().catch((error) => {
  console.error("[MCP Server] Fatal error:", error);
  process.exit(1);
});
