#!/usr/bin/env tsx
/**
 * Behavior Summary Generator
 *
 * Generates human-friendly markdown views of behaviors.json:
 * - behaviors.md: Executive dashboard (comprehensive snapshot)
 * - roadmap.md: Implementation view (dependency-ordered)
 * - progress.md: User journey view (by persona)
 * - backlog.md: Simple planning list
 *
 * Note: This file intentionally uses SCREAMING_SNAKE_CASE for lookups
 * to match taxonomy constants (STATUS, PRIORITY, EFFORT values).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface BehaviorRegistry {
  version: string;
  generated: string;
  product: string;
  behaviors: Record<string, Behavior>;
  views: {
    byStatus: Record<string, Array<string>>;
    byPersona: Record<string, Array<string>>;
    byTheme: Record<string, Array<string>>;
    byPriority: Record<string, Array<string>>;
    byDomain: Record<string, Array<string>>;
  };
  stats: {
    total: number;
    done: number;
    inProgress: number;
    planned: number;
    blocked: number;
    deprecated: number;
    completionPercentage: number;
  };
}

interface Behavior {
  id: string;
  domain: string;
  entity: string;
  operation: string;
  status: string;
  priority: string;
  effort: string;
  theme: string;
  persona: string;
  valueDomain?: string;
  valueType?: string;
  why: string;
  success?: string;
  impact?: string;
  who: string;
  what: string;
  acceptanceCriteria: Array<{ text: string; checked: boolean }>;
  dependencies: Array<string>;
  files: Array<string>;
  lastUpdated: string;
}

const WORKSPACE_ROOT = process.cwd();
const BEHAVIORS_JSON = join(WORKSPACE_ROOT, 'behaviors.json');

// Emoji helpers
const statusEmoji = (status: string): string =>
  ({
    DONE: '✅',
    IN_PROGRESS: '🔄',
    PLANNED: '📋',
    BLOCKED: '🚫',
    DEPRECATED: '❌',
  })[status] || '❓';

const priorityEmoji = (priority: string): string =>
  ({
    CRITICAL: '🔴',
    HIGH: '🟡',
    MEDIUM: '🟢',
    LOW: '🔵',
  })[priority] || '⚪';

const effortEmoji = (effort: string): string =>
  ({
    TRIVIAL: '⚡',
    SMALL: '🔹',
    MEDIUM: '🔸',
    LARGE: '🔶',
    XLARGE: '🔴',
  })[effort] || '❓';

function progressBar(completed: number, total: number, width = 30): string {
  const percentage = total > 0 ? completed / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(percentage * 100)}%`;
}

/**
 * Load behaviors registry
 */
async function loadRegistry(): Promise<BehaviorRegistry> {
  const content = await readFile(BEHAVIORS_JSON, 'utf-8');
  return JSON.parse(content) as BehaviorRegistry;
}

/**
 * Generate behaviors.md - Executive Dashboard
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: View generation naturally complex
function generateBehaviorsView(registry: BehaviorRegistry): string {
  const lines: Array<string> = [];

  lines.push(`# ${registry.product} - Behaviors Dashboard`);
  lines.push('');
  lines.push('> Executive snapshot of behavior development status');
  lines.push(`> Last updated: ${new Date(registry.generated).toLocaleString()}`);
  lines.push('');

  // Quick Stats
  lines.push('## 📊 Quick Stats');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| **Total Behaviors** | ${registry.stats.total} |`);
  lines.push(`| ✅ Done | ${registry.stats.done} |`);
  lines.push(`| 🔄 In Progress | ${registry.stats.inProgress} |`);
  lines.push(`| 📋 Planned | ${registry.stats.planned} |`);
  lines.push(`| 🚫 Blocked | ${registry.stats.blocked} |`);
  lines.push(`| **Completion** | **${registry.stats.completionPercentage}%** |`);
  lines.push('');
  lines.push(
    `**Overall Progress**: ${progressBar(registry.stats.done + registry.stats.inProgress, registry.stats.total, 40)}`
  );
  lines.push('');

  // Key Insights
  lines.push('## 💡 Key Insights');
  lines.push('');

  if (registry.stats.inProgress > 0) {
    lines.push(`- 🔄 **${registry.stats.inProgress} behaviors actively in progress**`);
  }
  if (registry.stats.blocked > 0) {
    lines.push(`- 🚫 **${registry.stats.blocked} behaviors blocked** - needs attention`);
  }
  if (registry.stats.planned > 0) {
    const criticalPlanned = (registry.views.byPriority.CRITICAL || []).filter(
      (id) => registry.behaviors[id]?.status === 'PLANNED'
    ).length;
    if (criticalPlanned > 0) {
      lines.push(`- 🔴 **${criticalPlanned} CRITICAL behaviors** waiting in backlog`);
    }
  }
  lines.push('');

  // Drill-down Links
  lines.push('## 📑 Detailed Views');
  lines.push('');
  lines.push(
    '- **[roadmap.md](roadmap.md)** - Implementation plan (dependency-ordered, what to build next)'
  );
  lines.push(
    '- **[progress.md](progress.md)** - User journey status (what works for each persona)'
  );
  lines.push('- **[backlog.md](backlog.md)** - Simple planning list (all PLANNED behaviors)');
  lines.push('');

  // Status Breakdown
  lines.push('## 📈 Status Breakdown');
  lines.push('');
  lines.push('| Status | Count | Behaviors |');
  lines.push('|--------|-------|----------|');

  for (const status of ['IN_PROGRESS', 'PLANNED', 'BLOCKED', 'DONE', 'DEPRECATED']) {
    const behaviorIds = registry.views.byStatus[status] || [];
    if (behaviorIds.length === 0) {
      continue;
    }
    const behaviorList = behaviorIds.map((id) => `\`${id}\``).join(', ');
    lines.push(
      `| ${statusEmoji(status)} ${status.replace('_', ' ')} | ${behaviorIds.length} | ${behaviorList} |`
    );
  }
  lines.push('');

  // Domain Overview
  lines.push('## 🏗️ Domain Overview');
  lines.push('');
  lines.push('| Domain | Behaviors | Done | In Progress | Planned |');
  lines.push('|--------|----------|------|-------------|---------|');

  for (const [domain, behaviorIds] of Object.entries(registry.views.byDomain)) {
    const behaviors = behaviorIds.map((id) => registry.behaviors[id]).filter(Boolean);
    const done = behaviors.filter((f) => f.status === 'DONE').length;
    const inProgress = behaviors.filter((f) => f.status === 'IN_PROGRESS').length;
    const planned = behaviors.filter((f) => f.status === 'PLANNED').length;

    lines.push(`| **${domain}** | ${behaviorIds.length} | ${done} | ${inProgress} | ${planned} |`);
  }
  lines.push('');

  // Priority Matrix
  lines.push('## 🎯 Priority Matrix');
  lines.push('');
  lines.push('| Priority | Total | Done | In Progress | Planned |');
  lines.push('|----------|-------|------|-------------|---------|');

  for (const priority of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    const behaviorIds = registry.views.byPriority[priority] || [];
    if (behaviorIds.length === 0) {
      continue;
    }

    const behaviors = behaviorIds.map((id) => registry.behaviors[id]).filter(Boolean);
    const done = behaviors.filter((f) => f.status === 'DONE').length;
    const inProgress = behaviors.filter((f) => f.status === 'IN_PROGRESS').length;
    const planned = behaviors.filter((f) => f.status === 'PLANNED').length;

    lines.push(
      `| ${priorityEmoji(priority)} ${priority} | ${behaviorIds.length} | ${done} | ${inProgress} | ${planned} |`
    );
  }
  lines.push('');

  // Value Classification (from AVF)
  lines.push('## 💎 Value Classification');
  lines.push('');
  lines.push('### By Value Domain');
  lines.push('');
  lines.push('| Domain | Behaviors | Description |');
  lines.push('|--------|----------|-------------|');

  const domainGroups: Record<string, Array<string>> = {};
  for (const [id, behavior] of Object.entries(registry.behaviors)) {
    const domain = behavior.valueDomain || 'UNCLASSIFIED';
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    domainGroups[domain].push(id);
  }

  const domainDescriptions: Record<string, string> = {
    CAPABILITY: 'Enables future value creation',
    TECHNICAL: 'Infrastructure and technical value',
    LEARNING: 'Reduces uncertainty through knowledge',
    DIRECT_BUSINESS: 'Immediate business impact',
    ORGANIZATIONAL: 'Team and process improvements',
  };

  for (const [domain, behaviorIds] of Object.entries(domainGroups)) {
    const desc = domainDescriptions[domain] || 'Not classified';
    lines.push(`| **${domain}** | ${behaviorIds.length} | ${desc} |`);
  }
  lines.push('');

  lines.push('### By Value Type');
  lines.push('');
  lines.push('| Type | Behaviors | Measurement Approach |');
  lines.push('|------|----------|----------------------|');

  const typeGroups: Record<string, Array<string>> = {};
  for (const [id, behavior] of Object.entries(registry.behaviors)) {
    const type = behavior.valueType || 'UNCLASSIFIED';
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push(id);
  }

  const typeMeasurements: Record<string, string> = {
    DIRECT: 'Quantitative metrics with baseline/target',
    ENABLING: 'Count of behaviors/capabilities enabled',
    STRATEGIC: 'Qualitative assessment with success criteria',
    LEARNING: 'Insights gained, hypotheses validated',
    EXPERIENTIAL: 'Satisfaction scores, engagement metrics',
  };

  for (const [type, behaviorIds] of Object.entries(typeGroups)) {
    const measurement = typeMeasurements[type] || 'To be defined';
    lines.push(`| **${type}** | ${behaviorIds.length} | ${measurement} |`);
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Auto-generated from behaviors.json - Run `yarn behaviors:summary` to update*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate ROADMAP.md - Implementation View
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: View generation naturally complex
function generateRoadmapView(registry: BehaviorRegistry): string {
  const lines: Array<string> = [];

  lines.push(`# ${registry.product} - Implementation Roadmap`);
  lines.push('');
  lines.push('> Dependency-ordered view of what to build and when');
  lines.push(`> Last updated: ${new Date(registry.generated).toLocaleString()}`);
  lines.push('');

  // Ready to Implement
  lines.push('## 🚀 Ready to Implement (No Blockers)');
  lines.push('');

  const allBehaviors = Object.values(registry.behaviors);
  const readyBehaviors = allBehaviors
    .filter((f) => f.status === 'PLANNED')
    .filter((f) => {
      // No dependencies OR all dependencies are DONE
      if (f.dependencies.length === 0) {
        return true;
      }
      return f.dependencies.every((depId) => {
        const dep = registry.behaviors[depId];
        return dep && dep.status === 'DONE';
      });
    })
    .sort((a, b) => {
      // Sort by priority then effort
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const effortOrder = { TRIVIAL: 0, SMALL: 1, MEDIUM: 2, LARGE: 3, XLARGE: 4 };

      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        effortOrder[a.effort as keyof typeof effortOrder] -
        effortOrder[b.effort as keyof typeof effortOrder]
      );
    });

  if (readyBehaviors.length === 0) {
    lines.push('*No behaviors ready - all have pending dependencies*');
  } else {
    for (const behavior of readyBehaviors) {
      lines.push(`### ${priorityEmoji(behavior.priority)} ${behavior.id}`);
      lines.push('');
      lines.push(
        `**Priority**: ${behavior.priority} | **Effort**: ${effortEmoji(behavior.effort)} ${behavior.effort}`
      );
      lines.push('');
      lines.push(`**Why**: ${behavior.why.split('\n')[0]}`);
      lines.push('');
      lines.push(`**Files**: ${behavior.files.map((f) => `[\`${f}\`](${f})`).join(', ')}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // Waiting on Dependencies
  lines.push('## ⏳ Waiting on Dependencies');
  lines.push('');

  const blockedBehaviors = allBehaviors
    .filter((f) => f.status === 'PLANNED')
    .filter((f) => f.dependencies.length > 0)
    .filter((f) => {
      return !f.dependencies.every((depId) => {
        const dep = registry.behaviors[depId];
        return dep && dep.status === 'DONE';
      });
    });

  if (blockedBehaviors.length === 0) {
    lines.push('*All behaviors are either ready or have no dependencies*');
  } else {
    for (const behavior of blockedBehaviors) {
      const pendingDeps = behavior.dependencies.filter((depId) => {
        const dep = registry.behaviors[depId];
        return !dep || dep.status !== 'DONE';
      });

      lines.push(`### ${behavior.id}`);
      lines.push('');
      lines.push(`**Blocked by**: ${pendingDeps.map((id) => `\`${id}\``).join(', ')}`);
      lines.push('');
    }
  }
  lines.push('');

  // Dependency Graph
  lines.push('## 🔗 Dependency Graph');
  lines.push('');

  const behaviorsWithDeps = allBehaviors.filter((f) => f.dependencies.length > 0);
  if (behaviorsWithDeps.length > 0) {
    lines.push('```mermaid');
    lines.push('graph TD');

    for (const behavior of behaviorsWithDeps) {
      for (const dep of behavior.dependencies) {
        const depBehavior = registry.behaviors[dep];
        const behaviorStatus = behavior.status === 'DONE' ? ':::done' : '';
        const depStatus = depBehavior?.status === 'DONE' ? ':::done' : '';

        lines.push(
          `  ${dep.replace(/\./g, '_')}${depStatus} --> ${behavior.id.replace(/\./g, '_')}${behaviorStatus}`
        );
      }
    }

    lines.push('  classDef done fill:#90EE90');
    lines.push('```');
  } else {
    lines.push('*No dependencies defined yet*');
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Auto-generated from behaviors.json - Run `yarn behaviors:summary` to update*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate PROGRESS.md - User Journey View
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: View generation naturally complex
function generateProgressView(registry: BehaviorRegistry): string {
  const lines: Array<string> = [];

  lines.push(`# ${registry.product} - User Journey Progress`);
  lines.push('');
  lines.push('> What works for each persona (user capability view)');
  lines.push(`> Last updated: ${new Date(registry.generated).toLocaleString()}`);
  lines.push('');

  // By Persona
  for (const [persona, behaviorIds] of Object.entries(registry.views.byPersona)) {
    if (behaviorIds.length === 0) {
      continue;
    }

    const behaviors = behaviorIds.map((id) => registry.behaviors[id]).filter(Boolean);
    const done = behaviors.filter((f) => f.status === 'DONE').length;
    const _inProgress = behaviors.filter((f) => f.status === 'IN_PROGRESS').length;

    lines.push(`## 👤 ${persona}`);
    lines.push('');
    lines.push(
      `**Progress**: ${progressBar(done, behaviors.length, 30)} (${done}/${behaviors.length} behaviors complete)`
    );
    lines.push('');

    // Behaviors for this persona
    for (const behavior of behaviors) {
      const totalCriteria = behavior.acceptanceCriteria.length;
      const completedCriteria = behavior.acceptanceCriteria.filter((c) => c.checked).length;

      lines.push(`### ${statusEmoji(behavior.status)} ${behavior.id}`);
      lines.push('');
      lines.push(
        `**Status**: ${behavior.status} | **Priority**: ${priorityEmoji(behavior.priority)} ${behavior.priority}`
      );
      lines.push('');

      if (behavior.who) {
        lines.push(`**Who**: ${behavior.who.split('\n')[0]}`);
        lines.push('');
      }

      if (totalCriteria > 0) {
        lines.push(
          `**Acceptance Criteria**: ${progressBar(completedCriteria, totalCriteria, 20)} (${completedCriteria}/${totalCriteria})`
        );
        lines.push('');

        for (const criteria of behavior.acceptanceCriteria.slice(0, 5)) {
          lines.push(`- [${criteria.checked ? 'x' : ' '}] ${criteria.text}`);
        }

        if (totalCriteria > 5) {
          lines.push(`- *...and ${totalCriteria - 5} more*`);
        }
      }

      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Footer
  lines.push('*Auto-generated from behaviors.json - Run `yarn behaviors:summary` to update*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate BACKLOG.md - Simple List
 */
function generateBacklogView(registry: BehaviorRegistry): string {
  const lines: Array<string> = [];

  lines.push(`# ${registry.product} - Backlog`);
  lines.push('');
  lines.push('> Simple planning list of all PLANNED behaviors');
  lines.push(`> Last updated: ${new Date(registry.generated).toLocaleString()}`);
  lines.push('');

  const plannedBehaviors = Object.values(registry.behaviors)
    .filter((f) => f.status === 'PLANNED')
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const effortOrder = { TRIVIAL: 0, SMALL: 1, MEDIUM: 2, LARGE: 3, XLARGE: 4 };

      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        effortOrder[a.effort as keyof typeof effortOrder] -
        effortOrder[b.effort as keyof typeof effortOrder]
      );
    });

  lines.push(`## 📋 ${plannedBehaviors.length} Behaviors in Backlog`);
  lines.push('');

  let currentPriority = '';
  for (const behavior of plannedBehaviors) {
    if (behavior.priority !== currentPriority) {
      currentPriority = behavior.priority;
      lines.push(`### ${priorityEmoji(currentPriority)} ${currentPriority}`);
      lines.push('');
    }

    const hasBlockers = behavior.dependencies.some((depId) => {
      const dep = registry.behaviors[depId];
      return !dep || dep.status !== 'DONE';
    });

    const blocker = hasBlockers ? ' 🚫 *blocked*' : '';

    lines.push(
      `- **${behavior.id}** - ${effortEmoji(behavior.effort)} ${behavior.effort}${blocker}`
    );
    lines.push(`  - ${behavior.why.split('\n')[0]}`);
    if (behavior.dependencies.length > 0) {
      lines.push(`  - Depends on: ${behavior.dependencies.map((d) => `\`${d}\``).join(', ')}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Auto-generated from behaviors.json - Run `yarn behaviors:summary` to update*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    console.log('📊 Generating behavior summary views...\n');

    const registry = await loadRegistry();

    // Generate all views
    const views = [
      { name: '.flow/behaviors.md', content: generateBehaviorsView(registry) },
      { name: '.flow/roadmap.md', content: generateRoadmapView(registry) },
      { name: '.flow/progress.md', content: generateProgressView(registry) },
      { name: '.flow/backlog.md', content: generateBacklogView(registry) },
    ];

    // Write all views
    for (const view of views) {
      await writeFile(join(WORKSPACE_ROOT, view.name), view.content, 'utf-8');
      console.log(`✅ Generated ${view.name}`);
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total Behaviors: ${registry.stats.total}`);
    console.log(`   ✅ Done: ${registry.stats.done}`);
    console.log(`   🔄 In Progress: ${registry.stats.inProgress}`);
    console.log(`   📋 Planned: ${registry.stats.planned}`);
    console.log(`   Completion: ${registry.stats.completionPercentage}%`);
  } catch (_error) {
    process.exit(1);
  }
}

main();
