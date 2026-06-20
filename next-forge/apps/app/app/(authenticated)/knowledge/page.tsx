import type { Metadata } from "next";
import { InboxSearch } from "./components/inbox-search";

export const metadata: Metadata = {
  title: "Knowledge Base",
  description:
    "Search and explore all ingested knowledge, decisions, and assets",
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
          the inbox pipeline. New entries are auto-ingested from{" "}
          <code className="rounded bg-muted px-1">
            GenerativeUI_monorepo/docs/inbox/
          </code>
          .
        </p>
      </div>
      <InboxSearch />
    </div>
  );
}
