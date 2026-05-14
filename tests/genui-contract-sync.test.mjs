import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = "/home/runner/work/modme-ui-01/modme-ui-01";
const manifestPath = path.join(repoRoot, "src/lib/element-manifest.json");
const panelRegistryPath = path.join(repoRoot, "src/lib/panel-registry.tsx");
const bootstrapRoutePath = path.join(repoRoot, "src/app/api/bootstrap/route.ts");
const agentMainPath = path.join(repoRoot, "agent/main.py");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const panelRegistrySource = fs.readFileSync(panelRegistryPath, "utf8");
const bootstrapSource = fs.readFileSync(bootstrapRoutePath, "utf8");
const agentSource = fs.readFileSync(agentMainPath, "utf8");

function extractRendererTypes(source) {
  const match = source.match(/const PANEL_RENDERER_MAP:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!match) return new Set();
  const mapBody = match[1];
  const types = [...mapBody.matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map(
    (m) => m[1],
  );
  return new Set(types);
}

test("manifest defines required element metadata fields", () => {
  assert.ok(Array.isArray(manifest.elements) && manifest.elements.length > 0);
  for (const element of manifest.elements) {
    assert.equal(typeof element.id, "string");
    assert.equal(typeof element.title, "string");
    assert.equal(typeof element.category, "string");
    assert.ok(Array.isArray(element.requiredProps) && element.requiredProps.length > 0);
    assert.equal(typeof element.promptHint, "string");
  }
});

test("panel registry renderer map stays aligned with manifest element IDs", () => {
  const manifestTypes = new Set(manifest.elements.map((e) => e.id));
  const rendererTypes = extractRendererTypes(panelRegistrySource);
  assert.deepEqual(rendererTypes, manifestTypes);
});

test("bootstrap contract includes starter preset and variant fields", () => {
  assert.match(bootstrapSource, /starterElements/);
  assert.match(bootstrapSource, /activePreset/);
  assert.match(bootstrapSource, /workspaceVariants/);
  assert.match(bootstrapSource, /elementManifest/);
});

test("agent uses shared manifest and exposes preset bootstrap tool", () => {
  assert.match(agentSource, /element-manifest\.json/);
  assert.match(agentSource, /ALLOWED_TYPES = _load_allowed_types\(\)/);
  assert.match(agentSource, /def apply_canvas_preset\(/);
});

test("preset element types are constrained to known manifest element IDs", () => {
  const allowedTypes = new Set(manifest.elements.map((element) => element.id));
  for (const preset of manifest.presets ?? []) {
    for (const element of preset.elements ?? []) {
      assert.ok(
        allowedTypes.has(element.type),
        `Preset '${preset.id}' references unknown type '${element.type}'`,
      );
    }
  }
});
