export type UIElement = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type AgentState = {
  elements: UIElement[];
};