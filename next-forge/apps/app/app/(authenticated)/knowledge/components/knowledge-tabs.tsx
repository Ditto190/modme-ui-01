"use client";

import { useState } from "react";
import { InboxSearch } from "./inbox-search";
import { SessionOpsPanel } from "./session-ops-panel";

type KnowledgeTab = "inbox" | "session-ops";

export function KnowledgeTabs() {
  const [tab, setTab] = useState<KnowledgeTab>("inbox");

  return (
    <>
      <div className="flex gap-2 border-b pb-2">
        <button
          className={`rounded px-3 py-1.5 text-sm ${
            tab === "inbox"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setTab("inbox")}
          type="button"
        >
          Inbox
        </button>
        <button
          className={`rounded px-3 py-1.5 text-sm ${
            tab === "session-ops"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setTab("session-ops")}
          type="button"
        >
          Session Ops
        </button>
      </div>

      {tab === "inbox" ? <InboxSearch /> : <SessionOpsPanel />}
    </>
  );
}
