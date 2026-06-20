"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

export interface InboxEntryListItem {
  agentName: string | null;
  agentRole: string | null;
  branchName: string | null;
  category: { name: string; slug: string } | null;
  categoryId: string | null;
  createdAt: string;
  entryType: string | null;
  id: string;
  severity: string;
  sourceFile: string;
  sourceFormat: string;
  status: string;
  summary: string | null;
  tags: string[];
  title: string | null;
}

interface InboxQueryParams {
  format?: string;
  limit?: number;
  q?: string;
  severity?: string;
  status?: string;
  tags?: string;
  type?: string;
}

interface InboxPage {
  data: InboxEntryListItem[];
  hasMore: boolean;
  nextCursor?: string;
}

async function fetchInboxEntries(
  params: InboxQueryParams,
  cursor?: string
): Promise<InboxPage> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.format) {
    searchParams.set("format", params.format);
  }
  if (params.type) {
    searchParams.set("type", params.type);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.tags) {
    searchParams.set("tags", params.tags);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3102";
  const res = await fetch(`${apiBase}/api/inbox?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Inbox API error: ${res.status}`);
  }
  return res.json();
}

export function useInboxEntries(params: InboxQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: ["inbox-entries", params],
    queryFn: ({ pageParam }) =>
      fetchInboxEntries(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000, // 30s — fresh enough for admin UI
  });
}
