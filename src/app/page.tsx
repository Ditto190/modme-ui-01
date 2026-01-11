"use client";

import { ChartCard } from "@/components/registry/ChartCard";
import { DataTable } from "@/components/registry/DataTable";
import { StatCard } from "@/components/registry/StatCard";
import { AgentState, UIElement } from "@/lib/types";
import { useCoAgent, useFrontendTool } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { z } from "zod";
import { GenerativeCanvas } from "./canvas/GenerativeCanvas";

// Validation schema for theme color
const ThemeColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format");

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");

  useFrontendTool({
    name: "setThemeColor",
    parameters: [
      {
        name: "themeColor",
        description: "Hex color code (e.g., #ff6600)",
        required: true,
      },
    ],
    handler({ themeColor }) {
      try {
        // Validate color format
        ThemeColorSchema.parse(themeColor);
        setThemeColor(themeColor);
        console.info(`Theme color updated to ${themeColor}`);
      } catch (error) {
        console.error("Invalid theme color:", themeColor, error);
        // Don't update state if invalid
      }
    },
  });

  return (
    <main
      style={
        { "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties
      }
    >
      <CopilotSidebar
        disableSystemMessage={true}
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Workbench Assistant",
          initial:
            "👋 I'm your Workbench Assistant. Tell me what you want to build.",
        }}
        suggestions={[
          {
            title: "KPI Dashboard",
            message:
              "Generate a sales KPI dashboard with revenue, users, and churn status cards.",
          },
          {
            title: "Customer Table",
            message:
              "Show me a table of recent customers with their email and plan.",
          },
          {
            title: "Analytics Chart",
            message: "Add a line chart showing weekly growth data.",
          },
          {
            title: "Clear All",
            message: "Clear the canvas.",
          },
        ]}
      >
        <YourMainContent />
      </CopilotSidebar>
    </main>
  );
}

function YourMainContent() {
  const { state } = useCoAgent<AgentState>({
    name: "WorkbenchAgent",
    initialState: {
      elements: [],
    },
  });

  // Safe access with fallback
  const elements = state?.elements || [];

  const renderElement = (el: UIElement) => {
    switch (el.type) {
      case "StatCard":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <StatCard key={el.id} {...(el.props as any)} />;
      case "DataTable":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <DataTable key={el.id} {...(el.props as any)} />;
      case "ChartCard":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <ChartCard key={el.id} {...(el.props as any)} />;
      default:
        // Log unknown types for debugging
        console.error(`Unknown component type: ${el.type}`, el);
        return (
          <div
            key={el.id}
            className="p-4 bg-red-50 text-red-500 rounded-xl border border-red-200"
          >
            <p className="font-semibold">Unknown component type: {el.type}</p>
            <p className="text-sm mt-1">
              Expected: StatCard, DataTable, or ChartCard
            </p>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">
                Debug Info
              </summary>
              <pre className="text-xs mt-1 overflow-auto bg-white p-2 rounded">
                {JSON.stringify(el, null, 2)}
              </pre>
            </details>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-slate-50 overflow-hidden flex flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">GenUI Workbench</h1>
        <p className="text-slate-500 italic">
          Dynamic surface managed by WorkbenchAgent
        </p>
      </div>

      <GenerativeCanvas>
        <div className="flex flex-wrap gap-6 items-start">
          {elements.length > 0 ? (
            elements.map(renderElement)
          ) : (
            <div className="w-full text-center py-20 text-slate-400">
              <p className="text-lg font-medium mb-2">No elements yet</p>
              <p className="text-sm">Ask the assistant to generate some UI.</p>
            </div>
          )}
        </div>
      </GenerativeCanvas>
    </div>
  );
}
