export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    status: number;
    fields?: Record<string, string[]>;
  };
}

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiClient {
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
}
