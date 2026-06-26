import { describe, expect, it } from "vitest";
import { scanForSecrets } from "../lib/secret-scan.mjs";

describe("scanForSecrets", () => {
  it("returns empty for clean content", () => {
    expect(scanForSecrets("# Architecture note\nNo secrets here.")).toEqual([]);
  });

  it("detects stripe live keys", () => {
    const findings = scanForSecrets("key = sk_live_abc123xyz789");
    expect(findings.some((f) => f.name === "stripe_live_key")).toBe(true);
  });

  it("detects private key blocks", () => {
    const findings = scanForSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIE");
    expect(findings.some((f) => f.name === "private_key")).toBe(true);
  });
});
