/**
 * TypeScript declarations for build utilities
 */

declare module "@/utils/fetch" {
  import type { FetchOptions } from "ofetch";

  export const $fetch: typeof import("ofetch").ofetch;
  export const $api: typeof import("ofetch").ofetch;
  export const $external: typeof import("ofetch").ofetch;

  export function $graphql<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T>;

  export function $upload(
    url: string,
    file: File,
    options?: FetchOptions
  ): Promise<any>;

  export function $stream(
    url: string,
    options?: FetchOptions
  ): AsyncGenerator<string>;

  export type { FetchOptions };
}

declare module "virtual:my-module" {
  export const msg: string;
}
