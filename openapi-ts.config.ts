/**
 * OpenAPI TypeScript Client Configuration for AI Tool Maker
 *
 * This config is used by aitm (AI Tool Maker) to generate
 * type-safe API clients from OpenAPI specs.
 *
 * References:
 * - https://heyapi.dev/openapi-ts/configuration
 * - https://github.com/nihaocami/ai-tool-maker
 */

import type { CreateClientConfig } from "@hey-api/client-fetch";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,

  // Base URL for MCP agent server
  baseUrl: process.env.AGENT_URL || "http://localhost:8000",

  // Default headers
  headers: {
    "Content-Type": "application/json",

    // Add auth if available
    ...(process.env.MCP_AUTH_TOKEN && {
      Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
    }),
  },

  // Timeout configuration (30 seconds)
  // MCP tools can be slow, especially collection scans
  timeout: 30000,

  // Error handling
  throwOnError: false, // Return errors instead of throwing

  // Request/response interceptors
  interceptors: {
    request: async (request) => {
      // Log requests in debug mode
      if (process.env.LOG_LEVEL === "debug") {
        console.log(`[MCP Request] ${request.method} ${request.url}`);
      }
      return request;
    },

    response: async (response) => {
      // Log responses in debug mode
      if (process.env.LOG_LEVEL === "debug") {
        console.log(`[MCP Response] ${response.status} ${response.url}`);
      }

      // Handle common error cases
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`[MCP Error] ${response.status}:`, errorData);
      }

      return response;
    },
  },
});

/**
 * Development configuration (with more logging)
 */
export const createDevClientConfig: CreateClientConfig = (config) => ({
  ...createClientConfig(config),

  timeout: 60000, // Longer timeout for dev

  interceptors: {
    request: async (request) => {
      console.log(`🔵 [MCP Request] ${request.method} ${request.url}`);
      if (request.body) {
        console.log(`   Payload:`, JSON.stringify(request.body, null, 2));
      }
      return request;
    },

    response: async (response) => {
      const data = await response.json().catch(() => null);
      console.log(`${response.ok ? "✅" : "❌"} [MCP Response] ${response.status}`);
      if (data) {
        console.log(`   Data:`, JSON.stringify(data, null, 2));
      }
      return response;
    },
  },
});
