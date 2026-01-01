export type UIElement = {
  id: string;
  type: string;
  props: any;
};

export type AgentState = {
  elements: UIElement[];
};