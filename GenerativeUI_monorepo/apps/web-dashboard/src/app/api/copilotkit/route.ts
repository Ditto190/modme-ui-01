import { CopilotRuntime, OpenAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const copilotKit = new CopilotRuntime();

  return copilotKit.response(req, new OpenAIAdapter());
}
