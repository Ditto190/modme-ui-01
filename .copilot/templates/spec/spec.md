Tool that uses text generator from text to summarize any text
mcpServer.registerTool({
  name: "summarize_text",
  description: "Summarizes the provided text using an LLM.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to be summarized.",
      },
    },
    required: ["text"],
  },
  async execute({ text }) {
    const prompt = `Please provide a concise summary of the following text:\n\n${text}\n\nSummary:`;
    const response = await callClaude(prompt);
    return response;
  },
});