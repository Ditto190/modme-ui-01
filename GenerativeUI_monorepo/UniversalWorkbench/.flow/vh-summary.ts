#!/usr/bin/env tsx
/**
 * Value Hypothesis Summary Generator
 *
 * Generates computed views and stats from value-hypotheses.json:
 * - Shows incomplete VHs ranked by value score (what to work on next)
 * - Computes stats (total, by status, avgScore)
 * - Generates vh-dashboard.md for human-friendly view
 *
 * Philosophy: Show incomplete work in value order. No manual gating.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface ValueHypothesisRegistry {
  version: string;
  product: string;
  description: string;
  mvpObjective?: string;
  hypotheses: Record<string, ValueHypothesis>;
}

interface ValueHypothesis {
  id: string;
  tier?: string;
  linkedBehaviors: Array<string>;
  statement: string;
  valueDomains: Array<string>;
  valuePotential: ValuePotential;
  valueRealized?: ValueRealized;
  dependencies?: Array<string>;
  blocks?: Array<string>;
  progress?: Record<string, unknown>;
  trialsEvidence?: TrialsEvidence;
  trialsLearning?: TrialsLearning;
  validationEvidence?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface ValuePotential {
  overall: number; // (impact × confidence) / (effort × (2-urgency))
  impact: number; // 0-1: Potential value impact
  confidence: number; // 0-1: Confidence in hypothesis
  effort: number; // 0-1: Implementation effort (lower = better)
  urgency: number; // 0-1: Time sensitivity
}

interface ValueRealized {
  actual: number; // Measured value delivered (0-1)
  alignmentScore: number; // How close to potential? (realized/potential)
  completedAt: string; // ISO timestamp
  outcomes: Array<string>; // IDs of AlignedOutcome records
}

interface TrialsEvidence {
  iteration: string;
  finding: string;
  constraint?: string;
  implication?: string;
  [key: string]: unknown;
}

interface TrialsLearning {
  problem: string;
  insight: string;
  examples?: {
    signal?: Array<string>;
    noise?: Array<string>;
  };
  [key: string]: unknown;
}

interface ComputedViews {
  incompleteByScore: Array<string>; // Incomplete VHs ranked by value (work queue)
  completedByScore: Array<string>; // Completed VHs for reference (archive)
  byStatus: Record<string, Array<string>>;
  byTier: Record<string, Array<string>>;
  byValueDomain: Record<string, Array<string>>;
  behaviorOwnership: Record<string, string>; // behavior ID → VH ID
}

interface ComputedStats {
  total: number;
  incomplete: number;
  completed: number;
  avgPotential: number;
  avgIncompletePotential: number;
}

const WORKSPACE_ROOT = process.cwd();
const VH_JSON = join(WORKSPACE_ROOT, '.flow/value-hypotheses.json');
const VH_DASHBOARD = join(WORKSPACE_ROOT, '.flow/vh-dashboard.md');

/**
 * Load value hypothesis registry
 */
async function loadRegistry(): Promise<ValueHypothesisRegistry> {
  const content = await readFile(VH_JSON, 'utf-8');
  return JSON.parse(content) as ValueHypothesisRegistry;
}

/**
 * Check if VH is incomplete (has no valueRealized)
 * VH is complete when all linked behaviors are DONE and outcomes measured
 */
function isIncomplete(vh: ValueHypothesis): boolean {
  return !vh.valueRealized;
}

/**
 * Compute views from hypotheses
 */
function computeViews(hypotheses: Record<string, ValueHypothesis>): ComputedViews {
  const byStatus: Record<string, Array<string>> = {};
  const byTier: Record<string, Array<string>> = {};
  const byValueDomain: Record<string, Array<string>> = {};
  const behaviorOwnership: Record<string, string> = {};

  const allVhs = Object.values(hypotheses);

  // Split into incomplete vs completed
  const incompleteVhs = allVhs.filter(isIncomplete);
  const completedVhs = allVhs.filter((vh) => !isIncomplete(vh));

  // Sort both by value descending
  const incompleteByScore = incompleteVhs
    .sort((a, b) => b.valuePotential.overall - a.valuePotential.overall)
    .map((vh) => vh.id);

  const completedByScore = completedVhs
    .sort((a, b) => (b.valueRealized?.actual ?? 0) - (a.valueRealized?.actual ?? 0))
    .map((vh) => vh.id);

  // Group by tier, value domain (status is computed, not stored)
  for (const vh of allVhs) {
    // By tier
    if (vh.tier) {
      if (!byTier[vh.tier]) {
        byTier[vh.tier] = [];
      }
      byTier[vh.tier].push(vh.id);
    }

    // By value domain (VHs can have multiple domains)
    for (const domain of vh.valueDomains) {
      if (!byValueDomain[domain]) {
        byValueDomain[domain] = [];
      }
      byValueDomain[domain].push(vh.id);
    }

    // Behavior ownership (behavior ID → VH ID)
    for (const behaviorId of vh.linkedBehaviors) {
      behaviorOwnership[behaviorId] = vh.id;
    }
  }

  return {
    incompleteByScore,
    completedByScore,
    byStatus,
    byTier,
    byValueDomain,
    behaviorOwnership,
  };
}

/**
 * Compute stats from hypotheses
 */
function computeStats(hypotheses: Record<string, ValueHypothesis>): ComputedStats {
  const allVhs = Object.values(hypotheses);
  const incompleteVhs = allVhs.filter(isIncomplete);
  const completedVhs = allVhs.filter((vh) => !isIncomplete(vh));

  const total = allVhs.length;
  const incomplete = incompleteVhs.length;
  const completed = completedVhs.length;

  const avgPotential =
    total > 0
      ? Math.round((allVhs.reduce((sum, vh) => sum + vh.valuePotential.overall, 0) / total) * 100) /
        100
      : 0;

  const avgIncompletePotential =
    incomplete > 0
      ? Math.round(
          (incompleteVhs.reduce((sum, vh) => sum + vh.valuePotential.overall, 0) / incomplete) * 100
        ) / 100
      : 0;

  return { total, incomplete, completed, avgPotential, avgIncompletePotential };
}

/**
 * Generate vh-dashboard.md
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Dashboard generation requires comprehensive formatting
function generateDashboard(
  registry: ValueHypothesisRegistry,
  views: ComputedViews,
  stats: ComputedStats
): string {
  const lines: Array<string> = [];

  lines.push(`# ${registry.product} - Value Hypotheses Dashboard`);
  lines.push('');
  if (registry.mvpObjective) {
    lines.push(`> **MVP Objective**: ${registry.mvpObjective}`);
    lines.push('');
  }
  lines.push('> Incomplete VHs ranked by value score - work top to bottom');
  lines.push('');

  // Quick Stats
  lines.push('## 📊 Quick Stats');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| **Total VHs** | ${stats.total} |`);
  lines.push(`| 🚧 Incomplete | ${stats.incomplete} |`);
  lines.push(`| ✅ Completed | ${stats.completed} |`);
  lines.push(`| **Avg Potential (All)** | ${stats.avgPotential} |`);
  lines.push(`| **Avg Potential (Incomplete)** | ${stats.avgIncompletePotential} |`);
  lines.push('');

  // Incomplete VHs (Work Queue) - grouped by tier
  lines.push('## 🚧 Incomplete Work (Ranked by Value)');
  lines.push('');
  lines.push('*Work from top to bottom within each tier. Higher scores = higher value.*');
  lines.push('');

  if (views.incompleteByScore.length === 0) {
    lines.push('*No incomplete VHs - all work completed!*');
    lines.push('');
  } else {
    // Group by tier for organization
    const tierOrder = [
      'FOUNDATION',
      'SIGNAL',
      'VALUE',
      'EXECUTION',
      'INTELLIGENCE',
      'PLATFORM',
      'UX',
      'EXPORT',
    ];
    const incompleteTiers: Record<string, Array<ValueHypothesis>> = {};

    for (const vhId of views.incompleteByScore) {
      const vh = registry.hypotheses[vhId];
      if (!vh) {
        continue;
      }

      const tier = vh.tier || 'UNCATEGORIZED';
      if (!incompleteTiers[tier]) {
        incompleteTiers[tier] = [];
      }
      incompleteTiers[tier].push(vh);
    }

    for (const tier of tierOrder) {
      const tierVhs = incompleteTiers[tier];
      if (!tierVhs || tierVhs.length === 0) {
        continue;
      }

      lines.push(`### ${tier} Tier`);
      lines.push('');

      for (const vh of tierVhs) {
        lines.push(`#### ${vh.id} (Potential: ${vh.valuePotential.overall})`);
        lines.push('');
        lines.push(`**Statement**: ${vh.statement}`);
        lines.push('');
        lines.push(
          `**Potential Components**: Impact=${vh.valuePotential.impact}, Confidence=${vh.valuePotential.confidence}, Effort=${vh.valuePotential.effort}, Urgency=${vh.valuePotential.urgency}`
        );
        lines.push('');
        lines.push(`**Linked Behaviors**: ${vh.linkedBehaviors.map((b) => `\`${b}\``).join(', ')}`);
        lines.push('');

        if (vh.dependencies && vh.dependencies.length > 0) {
          lines.push(`**Dependencies**: ${vh.dependencies.map((d) => `\`${d}\``).join(', ')}`);
          lines.push('');
        }

        if (vh.blocks && vh.blocks.length > 0) {
          lines.push(`**Blocks**: ${vh.blocks.map((b) => `\`${b}\``).join(', ')}`);
          lines.push('');
        }

        if (vh.trialsEvidence) {
          lines.push(`**Trials Evidence** (${vh.trialsEvidence.iteration}):`);
          lines.push(`- ${vh.trialsEvidence.finding}`);
          if (vh.trialsEvidence.constraint) {
            lines.push(`- Constraint: ${vh.trialsEvidence.constraint}`);
          }
          if (vh.trialsEvidence.implication) {
            lines.push(`- Implication: ${vh.trialsEvidence.implication}`);
          }
          lines.push('');
        }

        if (vh.trialsLearning) {
          lines.push('**Trials Learning**:');
          lines.push(`- Problem: ${vh.trialsLearning.problem}`);
          lines.push(`- Insight: ${vh.trialsLearning.insight}`);
          lines.push('');
        }

        lines.push('---');
        lines.push('');
      }
    }

    // Show uncategorized if any
    const uncategorized = incompleteTiers.UNCATEGORIZED;
    if (uncategorized && uncategorized.length > 0) {
      lines.push('### UNCATEGORIZED');
      lines.push('');
      for (const vh of uncategorized) {
        lines.push(`- ${vh.id} (${vh.valuePotential.overall}) - ${vh.statement}`);
      }
      lines.push('');
    }
  }

  // Completed VHs (Archive)
  lines.push('## ✅ Completed Work');
  lines.push('');

  if (views.completedByScore.length === 0) {
    lines.push('*No completed VHs yet*');
  } else {
    lines.push('| VH ID | Realized Value | Completed |');
    lines.push('|-------|----------------|-----------|');

    for (const vhId of views.completedByScore) {
      const vh = registry.hypotheses[vhId];
      if (vh?.valueRealized) {
        const completedDate = new Date(vh.valueRealized.completedAt).toLocaleDateString();
        lines.push(`| ${vh.id} | ${vh.valueRealized.actual} | ${completedDate} |`);
      }
    }
  }
  lines.push('');

  // Value Domain Distribution
  lines.push('## 💎 Value Domain Distribution');
  lines.push('');
  lines.push('| Domain | Count | VHs |');
  lines.push('|--------|-------|-----|');

  for (const [domain, vhIds] of Object.entries(views.byValueDomain)) {
    lines.push(
      `| **${domain}** | ${vhIds.length} | ${vhIds
        .slice(0, 5)
        .map((id) => `\`${id}\``)
        .join(', ')}${vhIds.length > 5 ? '...' : ''} |`
    );
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Auto-generated from value-hypotheses.json - Run `yarn vh:summary` to update*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    console.log('📊 Computing value hypothesis views and stats...\n');

    const registry = await loadRegistry();

    // Compute derived data
    const views = computeViews(registry.hypotheses);
    const stats = computeStats(registry.hypotheses);

    // Generate dashboard
    const dashboard = generateDashboard(registry, views, stats);
    await writeFile(VH_DASHBOARD, dashboard, 'utf-8');

    console.log('✅ Generated vh-dashboard.md');
    console.log('');
    console.log('📈 Summary:');
    console.log(`   Total VHs: ${stats.total}`);
    console.log(`   🚧 Incomplete: ${stats.incomplete}`);
    console.log(`   ✅ Completed: ${stats.completed}`);
    console.log(`   Avg Potential: ${stats.avgPotential}`);
    console.log('');
    console.log('Next: Work top-to-bottom on incomplete VHs:');
    for (const vhId of views.incompleteByScore.slice(0, 3)) {
      const vh = registry.hypotheses[vhId];
      if (vh) {
        console.log(`   ${vh.valuePotential.overall.toFixed(2)} - ${vhId}`);
      }
    }
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: CLI tool needs error reporting
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
