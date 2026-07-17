import { type MoleculeRecord, MoleculeRenderer } from "@repo/gen-engine";
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
  examples: [],
  complexity: "simple",
};

const meta = {
  title: "ModMe/Molecules/StaticTier",
  component: MoleculeRenderer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof MoleculeRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    molecule: staticMolecule,
    values: { path: "/workspace", pattern: "*.ts" },
  },
};
