/**
 * Panel Registry
 *
 * Single source of truth for all registered panel types.
 *
 * Architecture improvements applied here (from AGENTS.md analysis):
 * - Panel registration/orchestration: the renderElement switch is no longer
 *   inlined in page.tsx; every panel type has one canonical registration point.
 * - API contract discipline: PANEL_DEFINITIONS drives both the bootstrap
 *   endpoint response and the ALLOWED_TYPES guard on the Python agent.
 * - Dependency direction: types → panel-registry → page (no reverse imports).
 */

import { ChartCard } from "@/components/registry/ChartCard";
import { DataTable } from "@/components/registry/DataTable";
import { StatCard } from "@/components/registry/StatCard";
import { ELEMENT_MANIFEST } from "@/lib/element-manifest";
import { PanelDefinition, UIElement } from "@/lib/types";
import React from "react";

// ---------------------------------------------------------------------------
// Panel metadata
// ---------------------------------------------------------------------------

export const PANEL_DEFINITIONS: PanelDefinition[] = [
  ...ELEMENT_MANIFEST.map((element) => ({
    id: element.id,
    title: element.title,
    enabled: element.enabled,
    defaultSize: element.defaultSize,
    refreshIntervalMs: element.refreshIntervalMs,
  })),
];

// ---------------------------------------------------------------------------
// Renderer map — add a new entry here when adding a new component to the
// registry. Mirrors ALLOWED_TYPES in agent/main.py.
// ---------------------------------------------------------------------------

type PanelRenderer = (el: UIElement) => React.ReactElement;

const PANEL_RENDERER_MAP: Record<string, PanelRenderer> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StatCard: (el) => <StatCard key={el.id} {...(el.props as any)} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DataTable: (el) => <DataTable key={el.id} {...(el.props as any)} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ChartCard: (el) => <ChartCard key={el.id} {...(el.props as any)} />,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a UIElement using the registered panel renderer.
 * Falls back to a clearly-labelled error card for unknown types so the canvas
 * never shows a blank area without explanation.
 */
export function renderPanel(el: UIElement): React.ReactElement {
  const renderer = PANEL_RENDERER_MAP[el.type];

  if (!renderer) {
    console.error(`[panel-registry] Unknown panel type: "${el.type}"`, el);
    return (
      <div
        key={el.id}
        className="p-4 bg-red-50 text-red-500 rounded-xl border border-red-200"
      >
        <p className="font-semibold">Unknown panel type: {el.type}</p>
        <p className="text-sm mt-1">
          Registered: {Object.keys(PANEL_RENDERER_MAP).join(", ")}
        </p>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer hover:underline">
            Debug info
          </summary>
          <pre className="text-xs mt-1 overflow-auto bg-white p-2 rounded">
            {JSON.stringify(el, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return renderer(el);
}

/** Set of allowed type strings — kept in sync with PANEL_RENDERER_MAP. */
export const ALLOWED_PANEL_TYPES: ReadonlySet<string> = new Set(
  Object.keys(PANEL_RENDERER_MAP),
);
