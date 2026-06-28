"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpsSignalCardProps } from "../components/ops-signal-card";

interface SessionOpsResponse {
  count: number;
  data: OpsSignalCardProps[];
  tenant_id: string;
}

interface SessionOpsQueryParams {
  agentPlatform?: string;
  limit?: number;
  severity?: string;
  tenantId?: string;
}

async function fetchSessionOps(
  params: SessionOpsQueryParams
): Promise<SessionOpsResponse> {
  const searchParams = new URLSearchParams();
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.tenantId) {
    searchParams.set("tenant_id", params.tenantId);
  }
  if (params.agentPlatform) {
    searchParams.set("agent_platform", params.agentPlatform);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3102";
  const res = await fetch(
    `${apiBase}/telemetry/ingest?${searchParams.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Session Ops API error: ${res.status}`);
  }
  return res.json();
}

export function useSessionOps(params: SessionOpsQueryParams = {}) {
  return useQuery({
    queryKey: ["session-ops", params],
    queryFn: () => fetchSessionOps(params),
    staleTime: 30_000,
  });
}
