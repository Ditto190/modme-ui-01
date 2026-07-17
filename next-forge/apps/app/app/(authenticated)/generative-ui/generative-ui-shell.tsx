"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { GenerativeCanvas } from "./generative-canvas";
import { MoleculeCatalogWorkspace } from "./molecule-catalog-workspace";

export function GenerativeUiShell() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <MoleculeCatalogWorkspace />
        </div>
        <aside className="space-y-4 rounded-xl border bg-card p-4">
          <div>
            <h2 className="font-semibold text-sm">Agent panel</h2>
            <p className="text-muted-foreground text-xs">
              WebSocket canvas (strangler — unchanged until TanStack AI
              cutover).
            </p>
          </div>
          <GenerativeCanvas />
        </aside>
      </div>
    </QueryClientProvider>
  );
}
