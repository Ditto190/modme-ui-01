import { showGenerativeUi } from "@repo/feature-flags";
import { notFound } from "next/navigation";
import { MoleculeWorkbench } from "./molecule-workbench";

export default async function GenerativeUiPage() {
  const generativeUiEnabled = await showGenerativeUi();

  if (!generativeUiEnabled) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[90rem] space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Generative UI</h1>
        <p className="text-muted-foreground text-sm">
          Browse the molecule catalog, preview schema-driven UI, and chat with
          the legacy agent-server WebSocket. Run{" "}
          <code className="rounded bg-muted px-1">yarn dev:generative</code> for
          the Python backend and{" "}
          <code className="rounded bg-muted px-1">
            yarn molecule-index --stack forge --semver 1.0.0
          </code>{" "}
          to refresh the catalog.
        </p>
      </div>
      <MoleculeWorkbench />
    </div>
  );
}
