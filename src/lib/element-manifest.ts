import manifestData from "@/lib/element-manifest.json";
import type {
  CanvasPreset,
  ElementTypeManifest,
  WorkspaceVariant,
} from "@/lib/types";

type ManifestData = {
  elements: ElementTypeManifest[];
  presets: CanvasPreset[];
  variants: WorkspaceVariant[];
};

const manifest = manifestData as ManifestData;
const DEFAULT_EMPTY_PRESET: CanvasPreset = {
  id: "empty",
  label: "Empty Canvas",
  category: "fallback",
  description: "Fallback preset used when no manifest presets are defined.",
  elements: [],
};

export const ELEMENT_MANIFEST = manifest.elements;
export const CANVAS_PRESETS = manifest.presets;
export const WORKSPACE_VARIANTS = manifest.variants;

export function getWorkspaceVariant(
  variantId: string | undefined,
): WorkspaceVariant {
  const matchedVariant = variantId
    ? WORKSPACE_VARIANTS.find((v) => v.id === variantId)
    : undefined;
  if (matchedVariant) return matchedVariant;

  const fallback = WORKSPACE_VARIANTS.find((v) => v.id === "default");
  return fallback ?? WORKSPACE_VARIANTS[0];
}

export function getCanvasPreset(presetId: string | undefined): CanvasPreset {
  return (
    CANVAS_PRESETS.find((preset) => preset.id === presetId) ??
    CANVAS_PRESETS[0] ??
    DEFAULT_EMPTY_PRESET
  );
}
