/**
 * GreptimeDB Observability Configuration (TypeScript/Node.js)
 *
 * Configures OpenTelemetry with GreptimeDB backend for metrics and traces.
 * Supports Next.js Edge runtime and Node.js environments.
 */

import { Meter, metrics, trace, Tracer } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface GreptimeDBConfig {
  host: string;
  database: string;
  username?: string;
  password?: string;
  serviceName: string;
  serviceVersion: string;
}

export class GreptimeDBObservability {
  private config: GreptimeDBConfig;
  private metricsEndpoint: string;
  private tracesEndpoint: string;
  private authHeader?: string;

  constructor(config?: Partial<GreptimeDBConfig>) {
    this.config = {
      host: config?.host || process.env.GREPTIME_HOST || "localhost:4000",
      database: config?.database || process.env.GREPTIME_DB || "public",
      username: config?.username || process.env.GREPTIME_USERNAME || "",
      password: config?.password || process.env.GREPTIME_PASSWORD || "",
      serviceName: config?.serviceName || "modme-genui-ui",
      serviceVersion: config?.serviceVersion || "0.1.0",
    };

    const baseUrl = `http://${this.config.host}/v1/otlp`;
    this.metricsEndpoint = `${baseUrl}/v1/metrics`;
    this.tracesEndpoint = `${baseUrl}/v1/traces`;

    // Generate Basic auth header if credentials provided
    if (this.config.username && this.config.password) {
      const credentials = `${this.config.username}:${this.config.password}`;
      this.authHeader = Buffer.from(credentials).toString("base64");
    }
  }

  private getHeaders(tableName?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Greptime-DB-Name": this.config.database,
    };

    if (this.authHeader) {
      headers["Authorization"] = `Basic ${this.authHeader}`;
    }

    if (tableName) {
      headers["X-Greptime-Log-Table-Name"] = tableName;
    }

    return headers;
  }

  private getResource(): Resource {
    return new Resource({
      [ATTR_SERVICE_NAME]: this.config.serviceName,
      [ATTR_SERVICE_VERSION]: this.config.serviceVersion,
      "deployment.environment": process.env.NODE_ENV || "development",
    });
  }

  /**
   * Setup OpenTelemetry metrics with GreptimeDB exporter
   */
  public setupMetrics(): Meter {
    const exporter = new OTLPMetricExporter({
      url: this.metricsEndpoint,
      headers: this.getHeaders(),
      timeoutMillis: 5000,
    });

    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 15000, // Export every 15 seconds
    });

    const meterProvider = new MeterProvider({
      resource: this.getResource(),
      readers: [reader],
    });

    metrics.setGlobalMeterProvider(meterProvider);

    console.log("[GreptimeDB] Metrics configured");
    console.log(`[GreptimeDB] Endpoint: ${this.metricsEndpoint}`);

    return metrics.getMeter(this.config.serviceName);
  }

  /**
   * Setup OpenTelemetry tracing with GreptimeDB exporter
   */
  public setupTracing(): Tracer {
    const exporter = new OTLPTraceExporter({
      url: this.tracesEndpoint,
      headers: this.getHeaders(),
      timeoutMillis: 5000,
    });

    const processor = new BatchSpanProcessor(exporter);

    const provider = new NodeTracerProvider({
      resource: this.getResource(),
    });

    provider.addSpanProcessor(processor);
    provider.register();

    trace.setGlobalTracerProvider(provider);

    console.log("[GreptimeDB] Tracing configured");
    console.log(`[GreptimeDB] Endpoint: ${this.tracesEndpoint}`);

    return trace.getTracer(this.config.serviceName);
  }

  /**
   * Initialize complete observability stack
   */
  public initialize(): { meter: Meter; tracer: Tracer } {
    const meter = this.setupMetrics();
    const tracer = this.setupTracing();

    console.log(
      `[GreptimeDB] Observability initialized for ${this.config.serviceName}`
    );
    console.log(`[GreptimeDB] Database: ${this.config.database}`);

    return { meter, tracer };
  }
}

/**
 * Singleton instance for convenient usage
 */
let observabilityInstance: GreptimeDBObservability | null = null;

export function initializeObservability(config?: Partial<GreptimeDBConfig>): {
  meter: Meter;
  tracer: Tracer;
} {
  if (!observabilityInstance) {
    observabilityInstance = new GreptimeDBObservability(config);
  }
  return observabilityInstance.initialize();
}

/**
 * Get existing observability instance
 */
export function getObservability(): GreptimeDBObservability {
  if (!observabilityInstance) {
    throw new Error(
      "Observability not initialized. Call initializeObservability() first."
    );
  }
  return observabilityInstance;
}
