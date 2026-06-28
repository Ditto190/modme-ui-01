import type { Metadata } from "next";
import { KnowledgeTabs } from "./components/knowledge-tabs";

export const metadata: Metadata = {
  title: "Knowledge Base",
  description:
    "Search ingested knowledge and monitor session observability signals",
};

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          Knowledge Base
        </h1>
        <p className="text-muted-foreground text-sm">
          Search all captured decisions, research, components, and assets from
          the inbox pipeline — plus Session Ops observability signals.
        </p>
      </div>
      <KnowledgeTabs />
    </div>
  );
}
