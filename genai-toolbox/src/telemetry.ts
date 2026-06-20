/**
 * OpenTelemetry Instrumentation Setup for GenAI Toolbox MCP Server
 *
 * Provides distributed tracing and metrics for:
 * - MCP tool invocations
 * - LLM sampling requests
 * - Database queries (if configured)
 * - External API calls
 */

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Initialize OpenTelemetry SDK
 *
 * Environment Variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP collector endpoint (default: http://localhost:4318)
 * - OTEL_SERVICE_NAME: Service name (default: genai-toolbox-mcp)
 * - OTEL_LOG_LEVEL: Log level (default: info)
 */
export function initializeTelemetry() {
  const serviceName = process.env.OTEL_SERVICE_NAME || "genai-toolbox-mcp";
  const serviceVersion = process.env.npm_package_version || "1.0.0";
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

  // Resource identifies your service in traces and metrics
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  });

  // Trace exporter - sends spans to OTLP collector
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  // Metric exporter - sends metrics to OTLP collector
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });

  // Metric reader - exports metrics every 60 seconds
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
  });

  // Initialize SDK with auto-instrumentation
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    // Cast to any to avoid TypeScript incompatibility between different OTEL MetricReader declarations
    metricReader: metricReader as unknown as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable instrumentations you don't need
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log(`[OpenTelemetry] Initialized for ${serviceName}`);
  console.log(`[OpenTelemetry] OTLP endpoint: ${otlpEndpoint}`);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("[OpenTelemetry] SDK shut down successfully"))
      .catch((error) =>
        console.error("[OpenTelemetry] Error shutting down SDK", error)
      )
      .finally(() => process.exit(0));
  });

  return sdk;
}

/**
 * Manual span creation for custom tracing
 *
 * Example:
 * ```typescript
 * import { trace } from '@opentelemetry/api';
 *
 * const tracer = trace.getTracer('genai-toolbox-mcp');
 * const span = tracer.startSpan('process_tool_call');
 *
 * try {
 *   // Your code here
 *   span.setAttribute('tool.name', 'summarize');
 *   span.setAttribute('tool.input_length', text.length);
 * } finally {
 *   span.end();
 * }
 * ```
 */
