import { type MoleculeRecord, MoleculeRenderer } from "@repo/gen-engine";
import type { Meta, StoryObj } from "@storybook/react";

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
  examples: [],
  complexity: "simple",
};

const meta = {
  title: "ModMe/Molecules/DeclarativeTier",
  component: MoleculeRenderer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof MoleculeRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    molecule: declarativeMolecule,
    values: { action: "status", branch: "dev" },
  },
};
