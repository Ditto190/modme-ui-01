/**
 * GET /api/bootstrap
 *
 * Bootstrap hydration endpoint — returns everything the UI needs to
 * initialize the canvas without per-panel waterfall requests.
 *
 * Architecture improvement: instead of loading N widgets with N requests on
 * startup, one call delivers panel config, feature flags, and allowed types.
 * This dramatically improves first-render speed on slow connections and is
 * especially important for dashboards with many concurrent panels.
 *
 * See docs/ARCHITECTURE_IMPROVEMENTS.md §2 for context.
 */

import { PANEL_DEFINITIONS } from "@/lib/panel-registry";
import { BootstrapResponse } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * Read a boolean feature flag from an environment variable.
 * Defaults to `true` when the variable is unset so the app works out of the
 * box; set `FEATURE_<NAME>=false` in `.env.local` to disable a panel type.
 */
function envFlag(name: string, defaultValue = true): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw !== "false" && raw !== "0";
}

export async function GET() {
  const enabledPanels = PANEL_DEFINITIONS.filter((p) => p.enabled);

  const payload: BootstrapResponse = {
    panelConfig: enabledPanels,
    activeVariant: process.env.DASHBOARD_VARIANT ?? "default",
    featureFlags: {
      enableChartCard: envFlag("FEATURE_CHART_CARD"),
      enableDataTable: envFlag("FEATURE_DATA_TABLE"),
      enableStatCard: envFlag("FEATURE_STAT_CARD"),
      enableBootstrapHydration: envFlag("FEATURE_BOOTSTRAP_HYDRATION"),
    },
    allowedTypes: enabledPanels.map((p) => p.id),
  };

  return NextResponse.json(payload, {
    headers: {
      // Bootstrap payload is stable for the duration of a session; a short
      // cache is safe. Adjust max-age to match your deployment cadence.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
