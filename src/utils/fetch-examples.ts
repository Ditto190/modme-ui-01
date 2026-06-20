/**
 * ofetch Usage Examples
 *
 * Based on: https://github.com/unjs/ofetch/tree/main/examples
 */

import { $api, $external, $fetch, $graphql, $stream, $upload } from "./fetch";

// Example 1: Basic GET request
export async function getUser(id: string) {
  return $api<{ id: string; name: string; email: string }>(`/users/${id}`);
}

// Example 2: POST with body
export async function createUser(data: { name: string; email: string }) {
  return $api("/users", {
    method: "POST",
    body: data,
  });
}

// Example 3: Query parameters
export async function searchUsers(query: string, limit = 10) {
  return $api("/users", {
    query: {
      q: query,
      limit,
    },
  });
}

// Example 4: Custom headers
export async function getProtectedResource() {
  return $fetch("/protected", {
    headers: {
      "X-Custom-Header": "value",
    },
  });
}

// Example 5: Error handling
type ApiErrorWithResponse = {
  response: {
    status: number;
    _data: unknown;
  };
  request?: unknown;
  message?: string;
};

type ApiErrorWithRequest = {
  request: unknown;
  message?: string;
};

type ErrorWithMessage = {
  message: string;
};

/**
 * Checks if the error object has a response property with a status property.
 * @returns {boolean} True if the error object has a response property with a status property, false otherwise.
 */

function hasResponse(error: unknown): error is ApiErrorWithResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response: unknown }).response === "object" &&
    (error as { response: { status?: unknown } }).response.status !== undefined
  );
}

function hasRequest(error: unknown): error is ApiErrorWithRequest {
  return (
    typeof error === "object" &&
    error !== null &&
    "request" in error
  );
}

/**
 * Checks if the error object has a 'message' property with a string value.
 * @param {unknown} error - Error object to check
 * @returns {boolean} True if the error object has a 'message' property with a string value, false otherwise.
 */
function hasMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

export async function safeApiCall(url: string) {
  try {
    return await $api(url);
  } catch (error: unknown) {
    if (hasResponse(error)) {
      // Server responded with error
      console.error("API error:", error.response.status, error.response._data);
    } else if (hasRequest(error) && hasMessage(error)) {
      // Request was made but no response
      console.error("Network error:", error.message);
    } else if (hasMessage(error)) {
      // Something else happened
      console.error("Error:", error.message);
    } else {
      // Fallback when error shape is unknown
      console.error("Unknown error:", error);

type ErrorWithMessage = {
  message: string;
};

/**
 * Checks if the given error has a response property.
 * This is useful for determining if an error is related to a
 * specific request.
 * @param {unknown} error The error to check.
 * @returns {boolean} Whether the error has a response property.
 */
function hasResponse(error: unknown): error is ApiErrorWithResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response: unknown }).response === "object" &&
    (error as { response: { status?: unknown } }).response.status !== undefined
  );
}

/**
 * Checks if the given error has a request property.
 * This is useful for determining if an error is related to a
 * specific request.
 * @param {unknown} error The error to check.
 * @returns {boolean} Whether the error has a request property.
 */
function hasRequest(error: unknown): error is ApiErrorWithRequest {
  return (
    typeof error === "object" &&
    error !== null &&
    "request" in error
  );
}

function hasMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

export async function safeApiCall(url: string) {
  try {
    return await $api(url);
  } catch (error: unknown) {
    if (hasResponse(error)) {
      // Server responded with error
      console.error("API error:", error.response.status, error.response._data);
    } else if (hasRequest(error) && hasMessage(error)) {
      // Request was made but no response
      console.error("Network error:", error.message);
    } else if (hasMessage(error)) {
      // Something else happened
      console.error("Error:", error.message);
    } else {
      // Fallback when error shape is unknown
      console.error("Unknown error:", error);
    }
    throw error;
  }
}

// Example 6: Retry on specific status codes
export async function callUnstableAPI(url: string) {
  return $fetch(url, {
    retry: 5,
    retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
    retryDelay: 1000,
  });
}

// Example 7: Interceptor pattern
export async function authenticatedRequest(url: string) {
  return $api(url, {
    onRequest({ options }) {
      // Modify request before sending
      options.headers = {
        ...options.headers,
        "X-Request-ID": crypto.randomUUID(),
      };
    },
    onResponse({ response }) {
      // Process response
      console.log("Response received:", response.status);
    },
  });
}

// Example 8: GraphQL query
export async function getUserWithPosts(userId: string) {
  return $graphql(
    `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
        posts {
          id
          title
          content
        }
      }
    }
  `,
    { id: userId }
  );
}

// Example 9: File upload
export async function uploadAvatar(file: File) {
  return $upload("/upload/avatar", file, {
    onUploadProgress(progress) {
      console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
    },
  });
}

// Example 10: Streaming responses
export async function streamLLMResponse(prompt: string) {
  const chunks: string[] = [];

  for await (const chunk of $stream("/llm/stream", {
    method: "POST",
    body: { prompt },
  })) {
    chunks.push(chunk);
    console.log("Chunk received:", chunk);
  }

  return chunks.join("");
}

// Example 11: Abort controller
export async function cancellableRequest(url: string) {
  const controller = new AbortController();

  // Cancel after 5 seconds
  setTimeout(() => controller.abort(), 5000);

  try {
    return await $fetch(url, {
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("Request was cancelled");
    }
    throw error;
  }
}

// Example 12: Parallel requests
export async function fetchMultiple() {
  const [users, posts, comments] = await Promise.all([
    $api("/users"),
    $api("/posts"),
    $api("/comments"),
  ]);

  return { users, posts, comments };
}

// Example 13: External API with custom base URL
export async function getGitHubUser(username: string) {
  return $external(`https://api.github.com/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });
}

// Example 14: Blob response
export async function downloadFile(url: string) {
  return $fetch<Blob>(url, {
    responseType: "blob",
  });
}

// Example 15: Text response
export async function getRawHtml(url: string) {
  return $fetch<string>(url, {
    responseType: "text",
  });
}
