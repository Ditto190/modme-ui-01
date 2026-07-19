import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyClipperUidAndPath,
  DEPRECATED_INBOX_PATH,
  isVaultInboxPath,
  listClipperJsonFiles,
  UID_PROP,
  VAULT_INBOX_PATH,
} from "../patch-clipper-uid-path.mjs";

const NOTE_TEMPLATES = path.join("templates", "obsidian-note-templates");
const DOCS_OBSIDIAN = path.join("docs", "obsidian");

describe("applyClipperUidAndPath", () => {
  it("migrates deprecated monorepo inbox path to vault-relative inbox", () => {
    const { json, changed } = applyClipperUidAndPath({
      path: DEPRECATED_INBOX_PATH,
      properties: [{ name: "title", value: "x", type: "text" }],
    });
    expect(changed).toBe(true);
    expect(json.path).toBe(VAULT_INBOX_PATH);
    expect(json.properties.some((p) => p.name === "uid")).toBe(true);
    expect(json.properties.find((p) => p.name === "uid")).toEqual(UID_PROP);
  });

  it("inserts uid after timestamp when present", () => {
    const { json } = applyClipperUidAndPath({
      path: VAULT_INBOX_PATH,
      properties: [
        { name: "timestamp", value: "t", type: "datetime" },
        { name: "title", value: "x", type: "text" },
      ],
    });
    expect(json.properties.map((p) => p.name)).toEqual([
      "timestamp",
      "uid",
      "title",
    ]);
  });

  it("is idempotent when path and uid already set", () => {
    const base = {
      path: VAULT_INBOX_PATH,
      properties: [
        { name: "timestamp", value: "t", type: "datetime" },
        { ...UID_PROP },
      ],
    };
    const { changed } = applyClipperUidAndPath(base);
    expect(changed).toBe(false);
  });
});

describe("obsidian clipper pack invariants", () => {
  const files = listClipperJsonFiles();

  it("finds clipper JSON templates including Obsidian Help", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(
      files.some((f) => f.replace(/\\/g, "/").endsWith("modme-inbox-obsidian-help.json")),
    ).toBe(true);
  });

  it("every template uses vault path inbox (or inbox/web-clipper/…) and has uid property", () => {
    for (const file of files) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(isVaultInboxPath(json.path), `${file} path=${json.path}`).toBe(true);
      expect(json.path, file).not.toBe(DEPRECATED_INBOX_PATH);
      expect(Array.isArray(json.properties), file).toBe(true);
      for (const property of json.properties) {
        expect(property && typeof property === "object", `${file} invalid property entry`).toBe(true);
        expect(typeof property.name, `${file} property missing name`).toBe("string");
      }
      expect(
        json.properties.some((p) => p && p.name === "uid"),
        `${file} missing uid`,
      ).toBe(true);
      expect(json.schemaVersion).toBe("0.1.0");
      expect(typeof json.name).toBe("string");
      expect(typeof json.noteContentFormat).toBe("string");
    }
  });

  it("Obsidian Help template is TechArticle research, not SoftwareSourceCode", () => {
    const file = files.find((f) =>
      f.replace(/\\/g, "/").endsWith("modme-inbox-obsidian-help.json"),
    );
    expect(file, "modme-inbox-obsidian-help.json fixture").toBeTruthy();
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(json.name).toContain("Obsidian Help");
    const type = json.properties.find((p) => p.name === "type")?.value;
    const schemaType = json.properties.find((p) => p.name === "schema_type")?.value;
    expect(type).toBe("research");
    expect(schemaType).toBe("TechArticle");
    expect(schemaType).not.toBe("SoftwareSourceCode");
    const triggers = json.triggers.join("\n");
    expect(triggers).toMatch(/obsidian\.md/);
    expect(triggers).toMatch(/publish\.obsidian\.md/);
    expect(json.noteContentFormat).toContain("{{content}}");
  });

  it("Code Snippet triggers stay on GitHub blob/raw/gist/Cubic only", () => {
    const file = files.find((f) =>
      f.replace(/\\/g, "/").endsWith("modme-inbox-code-snippet.json"),
    );
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const triggers = json.triggers.join("\n");
    // Triggers are regex source strings (often with escaped dots: github\.com)
    expect(triggers).toMatch(/github/);
    expect(triggers).toMatch(/cubic/);
    expect(triggers).not.toMatch(/obsidian/);
    expect(triggers).not.toMatch(/publish/);
    const schemaType = json.properties.find((p) => p.name === "schema_type")?.value;
    expect(schemaType).toBe("SoftwareSourceCode");
  });

  it("Docs Site does not claim Obsidian help hosts", () => {
    const file = files.find((f) =>
      f.replace(/\\/g, "/").endsWith("modme-inbox-docs-site.json"),
    );
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const triggers = json.triggers.join("\n");
    expect(triggers).not.toContain("help.obsidian.md");
    expect(triggers).not.toContain("obsidian.md/help");
  });
});

describe("obsidian note + docs pack files", () => {
  it("ships unique-note and code-sandbox templates", () => {
    expect(fs.existsSync(path.join(NOTE_TEMPLATES, "tpl-unique-note.md"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(NOTE_TEMPLATES, "tpl-code-sandbox.md"))).toBe(
      true,
    );
    const unique = fs.readFileSync(
      path.join(NOTE_TEMPLATES, "tpl-unique-note.md"),
      "utf8",
    );
    expect(unique).toMatch(/uid:/);
    expect(unique).toMatch(/## Evidence/);
    const sandbox = fs.readFileSync(
      path.join(NOTE_TEMPLATES, "tpl-code-sandbox.md"),
      "utf8",
    );
    expect(sandbox).toMatch(/```python/);
    expect(sandbox).toMatch(/```typescript/);
    expect(sandbox).toMatch(/```javascript/);
  });

  it("ships documentation pack guides", () => {
    for (const name of [
      "README.md",
      "unique-notes.md",
      "advanced-uri-cookbook.md",
      "code-emitter.md",
      "clipper-source-matching.md",
      path.join("uris", "modme-vault-quick.md"),
    ]) {
      expect(fs.existsSync(path.join(DOCS_OBSIDIAN, name)), name).toBe(true);
    }
  });
});
