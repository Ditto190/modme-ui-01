export type UIElement = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type AgentState = {
  elements: UIElement[];
};

/** Metadata contract for a supported UI element type. */
export type ElementTypeManifest = {
  id: string;
  title: string;
  enabled: boolean;
  category: string;
  requiredProps: string[];
  promptHint: string;
  defaultSize?: { cols: number; rows: number };
  refreshIntervalMs?: number;
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
export type WorkspaceVariant = {
  id: string;
  label: string;
  /** Panel IDs enabled in this variant (subset of PANEL_DEFINITIONS). */
  panels: string[];
  /** Preset to seed when bootstrapping a blank canvas for this variant. */
  recommendedPreset?: string;
};

export type CanvasPreset = {
  id: string;
  label: string;
  category: string;
  description: string;
  elements: UIElement[];
};

/** Shape returned by GET /api/bootstrap for first-screen hydration. */
export type BootstrapResponse = {
  panelConfig: PanelDefinition[];
  elementManifest: ElementTypeManifest[];
  presets: Array<{
    id: string;
    label: string;
    category: string;
    description: string;
    elementCount: number;
  }>;
  starterElements: UIElement[];
  activePreset: string;
  workspaceVariants: WorkspaceVariant[];
  activeVariant: string;
  featureFlags: Record<string, boolean>;
  /** Mirrors ALLOWED_TYPES on the Python agent for quick frontend sync-check. */
  allowedTypes: string[];
};
