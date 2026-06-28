export interface GreptimeAgentSpanRecord {
  trace_id: string;
  span_id: string;
  tenant_id: string;
  session_id?: string | null;
  duration_ms?: number;
  span_name?: string | null;
  attributes?: Record<string, unknown>;
  timestamp?: number;
}

export interface GreptimeAgentMetricRecord {
  tenant_id: string;
  session_id?: string | null;
  metric_name: string;
  metric_value: number;
  attributes?: Record<string, unknown>;
  timestamp?: number;
}
