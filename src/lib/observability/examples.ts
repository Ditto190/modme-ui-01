/**
 * Observability Example for Next.js/React
 *
 * Demonstrates how to instrument the GenUI frontend with GreptimeDB metrics and traces.
 */

import { initializeObservability, getObservability } from "./greptime-config";
import { metrics, trace, context } from "@opentelemetry/api";

// ============================================================================
// INITIALIZATION (src/app/layout.tsx or instrumentation.ts)
// ============================================================================

/**
 * Initialize observability on app startup.
 * Call this once in your root layout or instrumentation file.
 */
export function initObservability() {
  try {
    const { meter, tracer } = initializeObservability({
      host: process.env.GREPTIME_HOST || "localhost:4000",
      database: process.env.GREPTIME_DB || "public",
      username: process.env.GREPTIME_USERNAME,
      password: process.env.GREPTIME_PASSWORD,
      serviceName: "modme-genui-ui",
      serviceVersion: "0.1.0",
    });

    console.log("[Observability] UI observability initialized");
    return { meter, tracer };
  } catch (error) {
    console.error("[Observability] Failed to initialize:", error);
    return { meter: null, tracer: null };
  }
}

// ============================================================================
// METRICS EXAMPLES
// ============================================================================

/**
 * Example: Track UI interactions with a counter
 */
export function trackUIInteraction(action: string, component: string) {
  try {
    const observability = getObservability();
    const meter = observability.setupMetrics();

    const interactionCounter = meter.createCounter("ui_interactions_total", {
      description: "Total UI interactions",
    });

    interactionCounter.add(1, {
      action,
      component,
      timestamp: Date.now(),
    });

    console.log(`[Metrics] Tracked ${action} on ${component}`);
  } catch (error) {
    console.error("[Metrics] Failed to track interaction:", error);
  }
}

/**
 * Example: Track component render time with a histogram
 */
export function trackRenderTime(componentName: string, durationMs: number) {
  try {
    const meter = metrics.getMeter("ui-metrics");

    const renderHistogram = meter.createHistogram(
      "ui_render_duration_milliseconds",
      {
        description: "Component render time distribution",
        unit: "ms",
      }
    );

    renderHistogram.record(durationMs, {
      component: componentName,
    });

    console.log(`[Metrics] ${componentName} rendered in ${durationMs}ms`);
  } catch (error) {
    console.error("[Metrics] Failed to track render time:", error);
  }
}

/**
 * Example: Track current state size with a gauge
 */
export function trackStateSize(elementCount: number) {
  try {
    const meter = metrics.getMeter("ui-metrics");

    const stateGauge = meter.createUpDownCounter("ui_state_elements_count", {
      description: "Current number of UI elements in agent state",
    });

    stateGauge.add(elementCount);

    console.log(`[Metrics] State size: ${elementCount} elements`);
  } catch (error) {
    console.error("[Metrics] Failed to track state size:", error);
  }
}

// ============================================================================
// TRACING EXAMPLES
// ============================================================================

/**
 * Example: Trace a user action with nested spans
 */
export async function tracedUserAction<T>(
  actionName: string,
  userId: string,
  action: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer("ui-tracing");

  return tracer.startActiveSpan(`user_action:${actionName}`, async (span) => {
    span.setAttribute("user.id", userId);
    span.setAttribute("action.name", actionName);
    span.setAttribute("action.timestamp", Date.now());

    try {
      const result = await action();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Example: Trace component rendering lifecycle
 */
export function traceComponentRender<T>(
  componentName: string,
  renderFn: () => T
): T {
  const tracer = trace.getTracer("ui-tracing");

  return tracer.startActiveSpan(`render:${componentName}`, (span) => {
    const startTime = performance.now();

    span.setAttribute("component.name", componentName);

    try {
      const result = renderFn();
      const renderTime = performance.now() - startTime;

      span.setAttribute("render.duration_ms", renderTime);
      span.setStatus({ code: 1 }); // OK

      // Also track with metrics
      trackRenderTime(componentName, renderTime);

      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Example: Trace API calls to the agent
 */
export async function traceAgentCall<T>(
  endpoint: string,
  payload: unknown,
  fetchFn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer("ui-tracing");

  return tracer.startActiveSpan("agent_api_call", async (span) => {
    span.setAttribute("http.method", "POST");
    span.setAttribute("http.url", endpoint);
    span.setAttribute("payload.size", JSON.stringify(payload).length);

    const startTime = performance.now();

    try {
      const result = await fetchFn();
      const duration = performance.now() - startTime;

      span.setAttribute("http.status_code", 200);
      span.setAttribute("http.duration_ms", duration);
      span.setStatus({ code: 1 }); // OK

      return result;
    } catch (error) {
      span.setAttribute("http.status_code", 500);
      span.setStatus({ code: 2, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// ============================================================================
// REACT HOOKS FOR OBSERVABILITY
// ============================================================================

import { useEffect, useCallback } from "react";

/**
 * React Hook: Track component mount/unmount
 */
export function useComponentLifecycleTracking(componentName: string) {
  useEffect(() => {
    const tracer = trace.getTracer("ui-tracing");
    const span = tracer.startSpan(`component_lifecycle:${componentName}`);

    span.setAttribute("lifecycle.event", "mount");
    span.setAttribute("component.name", componentName);

    trackUIInteraction("mount", componentName);

    return () => {
      span.setAttribute("lifecycle.event", "unmount");
      span.end();

      trackUIInteraction("unmount", componentName);
    };
  }, [componentName]);
}

/**
 * React Hook: Track user interactions with automatic instrumentation
 */
export function useTrackedCallback<T extends (...args: any[]) => any>(
  actionName: string,
  callback: T,
  deps: any[]
): T {
  return useCallback(
    ((...args: Parameters<T>) => {
      return tracedUserAction(actionName, "current-user", async () => {
        return callback(...args);
      });
    }) as T,
    [...deps, actionName]
  );
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Instrument a React component
 */
export function ExampleInstrumentedComponent() {
  // Track lifecycle
  useComponentLifecycleTracking("ExampleInstrumentedComponent");

  // Track button click
  const handleClick = useTrackedCallback(
    "button_click",
    () => {
      console.log("Button clicked!");
      trackUIInteraction("click", "submit_button");
    },
    []
  );

  return (
    <div>
      <button onClick={handleClick}>Tracked Button</button>
    </div>
  );
}

/**
 * Example 2: Instrument agent state fetching
 */
export async function fetchAgentState(agentName: string) {
  return traceAgentCall("/api/copilotkit", { agent: agentName }, async () => {
    const response = await fetch("/api/copilotkit", {
      method: "POST",
      body: JSON.stringify({ agent: agentName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch state: ${response.statusText}`);
    }

    const data = await response.json();

    // Track state size
    if (data.state?.elements) {
      trackStateSize(data.state.elements.length);
    }

    return data;
  });
}

/**
 * Example 3: Instrument component rendering with performance tracking
 */
export function ExamplePerformanceTrackedComponent({ data }: { data: any[] }) {
  return traceComponentRender("ExamplePerformanceTrackedComponent", () => {
    // Your expensive rendering logic
    return (
      <div>
        {data.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    );
  });
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Example: Track errors with context
 */
export function trackError(error: Error, context: Record<string, any>) {
  try {
    const tracer = trace.getTracer("ui-tracing");
    const span = tracer.startSpan("error_occurred");

    span.setAttribute("error.message", error.message);
    span.setAttribute("error.stack", error.stack || "No stack trace");

    Object.entries(context).forEach(([key, value]) => {
      span.setAttribute(`context.${key}`, String(value));
    });

    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    span.end();

    console.error("[Observability] Error tracked:", error, context);
  } catch (trackingError) {
    console.error("[Observability] Failed to track error:", trackingError);
  }
}
