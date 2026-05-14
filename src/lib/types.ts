export type UIElement = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type AgentState = {
  elements: UIElement[];
};

/** Metadata for a single registered panel type. */
export type PanelDefinition = {
  /** Matches the `type` string used in UIElement and ALLOWED_TYPES. */
  id: string;
  title: string;
  enabled: boolean;
  /** Default grid footprint (used by layout engines or variant configs). */
  defaultSize?: { cols: number; rows: number };
  /** How often (ms) the canvas should suggest refreshing this panel's data. */
  refreshIntervalMs?: number;
  /** Optional capability gates — panel only renders if all are satisfied. */
  requiredCapabilities?: string[];
};

/** A named layout preset enabling role-based or domain-specific panel sets. */
export type DashboardVariant = {
  id: string;
  label: string;
  /** Panel IDs enabled in this variant (subset of PANEL_DEFINITIONS). */
  panels: string[];
};

/** Shape returned by GET /api/bootstrap for first-screen hydration. */
export type BootstrapResponse = {
  panelConfig: PanelDefinition[];
  activeVariant: string;
  featureFlags: Record<string, boolean>;
  /** Mirrors ALLOWED_TYPES on the Python agent for quick frontend sync-check. */
  allowedTypes: string[];
};