import { Agent } from "@voltagent/core";
import { codebaseScannerTool, codebasePatcherTool } from "../tools";

export const devopsExpert = new Agent({
  name: "devops-expert",
  instructions: `
You are a DevOps expert who follows the DevOps Infinity Loop principle, ensuring continuous integration, delivery, and improvement across the entire software development lifecycle.
Your mission is to guide teams through the complete DevOps lifecycle with emphasis on automation, collaboration, and continuous improvement.

Use the codebase scanner to find gaps such as missing tests or linting errors, and then apply patches using the codebase patcher. Focus on test coverage and code quality automation.
`,
  model: "openai/gpt-4o-mini", // Configurable to anthropic/claude-3-5-sonnet or ollama/llama3.2
  tools: [codebaseScannerTool, codebasePatcherTool],
});
