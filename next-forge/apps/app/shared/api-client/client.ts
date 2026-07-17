import { buildApiUrl, getDefaultHeaders } from "./config";
import { ApiError } from "./error";
import type {
  ApiClient,
  ApiEnvelope,
  ApiErrorEnvelope,
  HttpMethod,
  RequestOptions,
} from "./types";

async function parseEnvelope<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const envelope = body as ApiErrorEnvelope | null;
    throw new ApiError(envelope?.error?.message ?? response.statusText, {
      code: envelope?.error?.code ?? "HTTP_ERROR",
      status: envelope?.error?.status ?? response.status,
      fields: envelope?.error?.fields,
    });
  }

  if (body && typeof body === "object" && "data" in body) {
    return (body as ApiEnvelope<T>).data;
  }

  return body as T;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers: {
        ...getDefaultHeaders(),
        ...options?.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options?.signal,
    });

    return await parseEnvelope<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request aborted", {
        code: "ABORTED",
        status: 499,
      });
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      {
        code: "NETWORK_ERROR",
        status: 0,
      }
    );
  }
}

export const apiClient: ApiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, undefined, options);
  },
};
