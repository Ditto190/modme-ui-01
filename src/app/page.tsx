"use client";

import { AgentState, UIElement } from "@/lib/types";
import {
  useCoAgent,
  useFrontendTool,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { GenerativeCanvas } from "./canvas/GenerativeCanvas";
import { StatCard } from "@/components/registry/StatCard";
import { DataTable } from "@/components/registry/DataTable";
import { ChartCard } from "@/components/registry/ChartCard";

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");

  useFrontendTool({
    name: "setThemeColor",
    parameters: [
      {
        name: "themeColor",
        description: "The theme color to set.",
        required: true,
      },
    ],
    handler({ themeColor }) {
      setThemeColor(themeColor);
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
          initial: "👋 I'm your Workbench Assistant. Tell me what you want to build.",
        }}
        suggestions={[
          {
            title: "KPI Dashboard",
            message: "Generate a sales KPI dashboard with revenue, users, and churn status cards.",
          },
          {
            title: "Customer Table",
            message: "Show me a table of recent customers with their email and plan.",
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

  const renderElement = (el: UIElement) => {
    switch (el.type) {
      case "StatCard":
        return <StatCard key={el.id} {...el.props} />;
      case "DataTable":
        return <DataTable key={el.id} {...el.props} />;
      case "ChartCard":
        return <ChartCard key={el.id} {...el.props} />;
      default:
        return (
          <div key={el.id} className="p-4 bg-red-50 text-red-500 rounded border border-red-200">
            Unknown component type: {el.type}
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-slate-50 overflow-hidden flex flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">GenUI Workbench</h1>
        <p className="text-slate-500 italic">Dynamic surface managed by WorkbenchAgent</p>
      </div>

      <GenerativeCanvas>
        <div className="flex flex-wrap gap-6 items-start">
          {state.elements && state.elements.length > 0 ? (
            state.elements.map(renderElement)
          ) : (
            <div className="w-full text-center py-20 text-slate-400">
              No elements yet. Ask the assistant to generate some UI.
            </div>
          )}
        </div>
      </GenerativeCanvas>
    </div>
  );
}
