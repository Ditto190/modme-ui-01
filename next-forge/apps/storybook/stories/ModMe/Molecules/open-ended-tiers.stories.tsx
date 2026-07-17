import { type MoleculeRecord, MoleculeRenderer } from "@repo/gen-engine";
import type { Meta, StoryObj } from "@storybook/react";

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
  examples: [],
  complexity: "complex",
};

const meta = {
  title: "ModMe/Molecules/OpenEndedTier",
  component: MoleculeRenderer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof MoleculeRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    molecule: openEndedMolecule,
    values: { problem: "Debug websocket reconnect loop", maxSteps: 5 },
  },
};
