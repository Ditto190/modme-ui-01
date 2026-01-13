/**
 * Complete Example: Building a Dashboard with ofetch + Agent Integration
 *
 * This example shows how to:
 * 1. Fetch data from external APIs using ofetch
 * 2. Process data with agent tools
 * 3. Create UI elements dynamically
 * 4. Handle errors gracefully
 */

import {
  addJournalEntry,
  createDashboard,
  upsertUIElement,
  type UIElement,
} from "@/utils/agent-integration";
import { $api, $fetch } from "@/utils/fetch";

/**
 * Example 1: Fetch GitHub Stats and Create Dashboard
 */
export async function createGitHubStatsDashboard(username: string) {
  try {
    // Step 1: Fetch data from GitHub API
    const user = await $fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    const repos = await $fetch(
      `https://api.github.com/users/${username}/repos`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        query: {
          sort: "updated",
          per_page: 5,
        },
      }
    );

    // Step 2: Process data and create UI elements
    const elements: UIElement[] = [
      {
        id: "github_followers",
        type: "StatCard",
        props: {
          title: "Followers",
          value: user.followers,
          trend: "+12%",
          trendDirection: "up",
        },
      },
      {
        id: "github_repos",
        type: "StatCard",
        props: {
          title: "Public Repos",
          value: user.public_repos,
        },
      },
      {
        id: "github_repos_table",
        type: "DataTable",
        props: {
          columns: ["Name", "Stars", "Language", "Updated"],
          data: repos.map((repo: any) => ({
            name: repo.name,
            stars: repo.stargazers_count,
            language: repo.language || "N/A",
            updated: new Date(repo.updated_at).toLocaleDateString(),
          })),
        },
      },
    ];

    // Step 3: Create dashboard
    await createDashboard(elements);

    // Step 4: Log to journal
    await addJournalEntry(`Created GitHub stats dashboard for ${username}`, {
      username,
      repos_count: repos.length,
    });

    return { success: true, username };
  } catch (error) {
    console.error("Failed to create GitHub dashboard:", error);
    throw error;
  }
}

/**
 * Example 2: Fetch Sales Data and Create KPI Dashboard
 */
export async function createSalesKPIDashboard() {
  try {
    // Fetch from your API
    const [revenue, customers, orders] = await Promise.all([
      $api<{ total: number; growth: number }>("/api/revenue"),
      $api<{ count: number; new: number }>("/api/customers"),
      $api<{ total: number; pending: number }>("/api/orders"),
    ]);

    // Create KPI cards
    await Promise.all([
      upsertUIElement("revenue_card", "StatCard", {
        title: "Monthly Revenue",
        value: revenue.total,
        trend: `+${revenue.growth}%`,
        trendDirection: revenue.growth > 0 ? "up" : "down",
      }),

      upsertUIElement("customers_card", "StatCard", {
        title: "Active Customers",
        value: customers.count,
        trend: `${customers.new} new`,
        trendDirection: "up",
      }),

      upsertUIElement("orders_card", "StatCard", {
        title: "Pending Orders",
        value: orders.pending,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to create sales dashboard:", error);
    throw error;
  }
}

/**
 * Example 3: Real-time Data Updates
 */
export async function setupRealtimeUpdates(endpoint: string) {
  // Polling approach
  const intervalId = setInterval(async () => {
    try {
      const data = await $api(endpoint);

      // Update UI element with fresh data
      await upsertUIElement("realtime_stat", "StatCard", {
        title: "Live Metric",
        value: data.value,
        trend: data.change,
      });
    } catch (error) {
      console.error("Realtime update failed:", error);
    }
  }, 5000); // Update every 5 seconds

  return () => clearInterval(intervalId);
}

/**
 * Example 4: Error Recovery Pattern
 */
export async function resilientDashboardCreation() {
  const fallbackData = {
    revenue: 0,
    customers: 0,
    orders: 0,
  };

  try {
    // Try to fetch real data
    const data = await $api("/api/dashboard-data", {
      retry: 3,
      retryDelay: 1000,
    });

    return data;
  } catch (error) {
    console.warn("Using fallback data due to error:", error);

    // Create dashboard with fallback data
    await upsertUIElement("error_notice", "StatCard", {
      title: "Status",
      value: "Offline Mode",
    });

    return fallbackData;
  }
}

/**
 * Example 5: Progress Tracking
 */
export async function createProgressDashboard(tasks: string[]) {
  let completed = 0;

  for (const task of tasks) {
    try {
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 1000));
      completed++;

      // Update progress
      await upsertUIElement("progress_card", "StatCard", {
        title: "Progress",
        value: `${completed}/${tasks.length}`,
        trend: `${Math.round((completed / tasks.length) * 100)}%`,
      });

      await addJournalEntry(`Completed: ${task}`);
    } catch (error) {
      console.error(`Task failed: ${task}`, error);
    }
  }
}

/**
 * Example 6: Multi-Source Data Aggregation
 */
export async function createAggregatedDashboard() {
  // Fetch from multiple sources in parallel
  const results = await Promise.allSettled([
    $fetch("https://api.github.com/users/octocat"),
    $api("/api/internal-metrics"),
    $fetch("https://api.external-service.com/stats"),
  ]);

  // Process results
  const elements: UIElement[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      elements.push({
        id: `source_${index}`,
        type: "StatCard",
        props: {
          title: `Source ${index + 1}`,
          value: "Available",
        },
      });
    } else {
      elements.push({
        id: `source_${index}`,
        type: "StatCard",
        props: {
          title: `Source ${index + 1}`,
          value: "Unavailable",
        },
      });
    }
  });

  await createDashboard(elements);
}

/**
 * Example 7: Conditional Dashboard Based on User Role
 */
export async function createRoleBasedDashboard(userRole: string) {
  const commonElements: UIElement[] = [
    {
      id: "welcome",
      type: "StatCard",
      props: { title: "Welcome", value: userRole },
    },
  ];

  // Add role-specific elements
  if (userRole === "admin") {
    commonElements.push({
      id: "admin_panel",
      type: "DataTable",
      props: {
        columns: ["User", "Role", "Status"],
        data: await $api("/api/admin/users"),
      },
    });
  } else if (userRole === "analyst") {
    commonElements.push({
      id: "analytics_chart",
      type: "ChartCard",
      props: {
        title: "Analytics",
        chartType: "line",
        data: await $api("/api/analytics/summary"),
      },
    });
  }

  await createDashboard(commonElements);
}

/**
 * Example 8: React Component Integration
 */
/*
'use client';

import { useState, useEffect } from 'react';
import { createGitHubStatsDashboard } from '@/utils/complete-example';

export function GitHubDashboard() {
  const [username, setUsername] = useState('octocat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await createGitHubStatsDashboard(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadDashboard();
  }, [username]);
  
  return (
    <div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="GitHub username"
      />
      <button onClick={loadDashboard} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
*/

/**
 * Example 9: Scheduled Dashboard Updates
 */
export function schedulePeriodicUpdates(
  createFn: () => Promise<void>,
  intervalMs: number = 60000
) {
  const update = async () => {
    try {
      await createFn();
      console.log("[Scheduler] Dashboard updated");
    } catch (error) {
      console.error("[Scheduler] Update failed:", error);
    }
  };

  // Initial update
  update();

  // Periodic updates
  const intervalId = setInterval(update, intervalMs);

  // Cleanup function
  return () => {
    clearInterval(intervalId);
    console.log("[Scheduler] Stopped periodic updates");
  };
}

/**
 * Example 10: Dashboard with Search
 */
export async function createSearchableDashboard(initialQuery: string = "") {
  const results = await $api("/api/search", {
    query: { q: initialQuery },
  });

  // Create results table
  await upsertUIElement("search_results", "DataTable", {
    columns: ["Title", "Description", "Score"],
    data: results.map((r: any) => ({
      title: r.title,
      description: r.description,
      score: r.relevance_score,
    })),
  });

  // Create stats
  await upsertUIElement("search_stats", "StatCard", {
    title: "Results Found",
    value: results.length,
  });
}
