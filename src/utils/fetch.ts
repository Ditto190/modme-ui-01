/**
 * ofetch Configuration
 *
 * Better fetch API with auto-retry, interceptors, and error handling
 * https://github.com/unjs/ofetch
 */

import { FetchOptions, ofetch } from "ofetch";

// Default configuration
const defaultOptions: FetchOptions = {
  // Retry on failure
  retry: 3,
  retryDelay: 500,

  // Timeout
  timeout: 30000,

  // Auto-parse responses
  parseResponse: JSON.parse,

  // Error handling
  onRequestError({ request, error }) {
    console.error("[fetch] Request error:", error);
  },

  onResponseError({ request, response }) {
    console.error("[fetch] Response error:", {
      url: request,
      status: response.status,
      statusText: response.statusText,
    });
  },
};

// Create configured instance
export const $fetch = ofetch.create(defaultOptions);

// Create instance for API calls
export const $api = ofetch.create({
  ...defaultOptions,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",

  // Add auth interceptor
  onRequest({ options }) {
    const token = process.env.NEXT_PUBLIC_API_TOKEN;
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  },

  // Transform responses
  onResponse({ response }) {
    // Log API calls in development
    if (process.env.NODE_ENV === "development") {
      console.log("[API]", response.url, response.status);
    }
  },
});

// Create instance for external APIs
export const $external = ofetch.create({
  ...defaultOptions,
  retry: 5,
  retryDelay: 1000,
  timeout: 60000,
});

// Helper for GraphQL queries
export async function $graphql<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await $api("/graphql", {
    method: "POST",
    body: {
      query,
      variables,
    },
  });

  if (response.errors) {
    throw new Error(response.errors[0]?.message || "GraphQL error");
  }

  return response.data;
}

// Helper for file uploads
export async function $upload(
  url: string,
  file: File,
  options?: FetchOptions
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  return $api(url, {
    method: "POST",
    body: formData,
    ...options,
  });
}

// Helper for streaming responses
export async function* $stream(
  url: string,
  options?: FetchOptions
): AsyncGenerator<string> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "text/event-stream",
      ...options?.headers,
    },
  });

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

// Export types
export type { FetchOptions } from "ofetch";
