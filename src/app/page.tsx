"use client";

import { renderPanel } from "@/lib/panel-registry";
import { AgentState } from "@/lib/types";
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
            elements.map(renderPanel)
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
