import { createHash } from "node:crypto";
import { z } from "zod";
import { InboxFrontmatterSchema } from "./inbox";

/**
 * Intake gate phases and vault-note promotion predicate.
 * Decision record: next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md
 * The PowerShell watcher (scripts/obsidian-intake-trigger.ps1) mirrors
 * shouldPromoteNote; if the rule changes, change both.
 */

export const INTAKE_PROMOTION_TAG = "intake/ready";

export const PromotionFrontmatterSchema = InboxFrontmatterSchema.partial({
  timestamp: true,
  agent: true,
  type: true,
}).extend({
  pipeline_ready: z.boolean().optional(),
});

export type PromotionFrontmatter = z.infer<typeof PromotionFrontmatterSchema>;

/** Parse untrusted frontmatter (vault files are external input). */
export function parsePromotionFrontmatter(raw: unknown): PromotionFrontmatter {
  return PromotionFrontmatterSchema.parse(raw);
}

export function shouldPromoteNote(frontmatter: PromotionFrontmatter): boolean {
  if (frontmatter.pipeline_ready === true) {
    return true;
  }
  if (frontmatter.severity === "high" || frontmatter.severity === "critical") {
    return true;
  }
  return frontmatter.tags.includes(INTAKE_PROMOTION_TAG);
}

export type GatePhase =
  | { readonly kind: "pre-session" }
  | { readonly kind: "during-session" }
  | { readonly kind: "pre-upsert" }
  | { readonly kind: "post-upsert" };

export interface GateCheck {
  readonly description: string;
  readonly command: string;
}

export function gateChecks(phase: GatePhase): readonly GateCheck[] {
  switch (phase.kind) {
    case "pre-session":
      return [
        { description: "lean-ctx config", command: "yarn lean-ctx:ensure" },
        { description: "worktree health", command: "yarn worktree:doctor" },
        { description: "env + session", command: "yarn session:start" },
      ];
    case "during-session":
      return [
        {
          description: "funnel audit",
          command: "node scripts/inbox-audit.mjs --lens funnel",
        },
      ];
    case "pre-upsert":
      return [
        {
          description: "contract validation (strict)",
          command: "node scripts/inbox-audit.mjs --lens funnel --strict",
        },
      ];
    case "post-upsert":
      return [
        {
          description: "pipeline audit",
          command: "node scripts/inbox-audit.mjs --lens pipeline",
        },
        {
          description: "Supabase advisors",
          command: "mcp get_advisors (security, performance)",
        },
      ];
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

/**
 * Debounce key for a watcher fire: order-insensitive digest of the
 * qualifying notes' content hashes. Two fires with the same trigger set
 * produce the same key, so the second run is skipped.
 */
export function triggerSetHash(contentHashes: readonly string[]): string {
  const canonical = [...new Set(contentHashes)].sort().join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
