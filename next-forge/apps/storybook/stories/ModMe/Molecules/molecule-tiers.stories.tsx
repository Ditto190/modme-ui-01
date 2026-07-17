import {
  compileDeclarativeForm,
  type MoleculeRecord,
  MoleculeRenderer,
} from "@repo/gen-engine";
import type { Meta, StoryObj } from "@storybook/react";

const staticMolecule: MoleculeRecord = {
  id: "file_explorer",
  name: "File Explorer",
  description: "Browse and navigate the file system",
  genUItier: "static",
  parameterSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      pattern: { type: "string" },
    },
    required: ["path"],
  },
  constraints: ["Cannot access system directories without permission"],
  route_hint: "component",
  tags: ["filesystem"],
  underlyingTools: ["filesystem.list_directory"],
  complexity: "simple",
};

const declarativeMolecule: MoleculeRecord = {
  id: "git_workspace",
  name: "Git Workspace",
  description: "View git status, diffs, branches",
  genUItier: "declarative",
  parameterSchema: {
    type: "object",
    properties: {
      action: {
        enum: ["status", "diff", "log", "branches"],
        description: "Git operation",
      },
      branch: { type: "string", description: "Branch name" },
    },
    required: ["action"],
  },
  constraints: ["Read-only operations only"],
  route_hint: "component",
  tags: ["git"],
  underlyingTools: ["git.git_status"],
  complexity: "simple",
};

const openEndedMolecule: MoleculeRecord = {
  id: "sequential_analyzer",
  name: "Sequential Analyzer",
  description: "Break complex problems into steps",
  genUItier: "open-ended",
  parameterSchema: {
    type: "object",
    properties: {
      problem: { type: "string" },
      maxSteps: { type: "number" },
    },
    required: ["problem"],
  },
  constraints: ["Keep steps focused and small"],
  route_hint: "visualization",
  tags: ["reasoning"],
  underlyingTools: ["sequential-thinking.create_thinking_process"],
  complexity: "complex",
};

const meta = {
  title: "ModMe/Molecules",
  component: MoleculeRenderer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof MoleculeRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StaticTier: Story = {
  args: {
    molecule: staticMolecule,
    values: { path: "/workspace", pattern: "*.ts" },
  },
};

export const DeclarativeTier: Story = {
  args: {
    molecule: declarativeMolecule,
    values: { action: "status", branch: "dev" },
  },
};

export const OpenEndedTier: Story = {
  args: {
    molecule: openEndedMolecule,
    values: { problem: "Debug websocket reconnect loop", maxSteps: 5 },
  },
};

export const DeclarativeFormCompilerPreview: Story = {
  render: () => {
    const descriptor = compileDeclarativeForm({
      toolName: "Search flights",
      toolDescription: "Search flights and display results",
      parameterSchema: declarativeMolecule.parameterSchema,
      autoSubmit: true,
    });

    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
        {JSON.stringify(descriptor.inputSchema, null, 2)}
      </pre>
    );
  },
};
