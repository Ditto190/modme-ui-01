function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
}

export function getDefaultHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function buildApiUrl(path: string): string {
  const base = resolveApiBaseUrl();
  if (path.startsWith("http")) {
    return path;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
