import { showGenerativeUi } from "@repo/feature-flags";
import { notFound } from "next/navigation";
import { GenerativeCanvas } from "./generative-canvas";

export default async function GenerativeUiPage() {
  const generativeUiEnabled = await showGenerativeUi();

  if (!generativeUiEnabled) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Generative UI</h1>
        <p className="text-muted-foreground text-sm">
          WebSocket client island connected to the legacy agent-server on port
          8000. Run{" "}
          <code className="rounded bg-muted px-1">yarn dev:generative</code> for
          the Python backend.
        </p>
      </div>
      <GenerativeCanvas />
    </div>
  );
}
