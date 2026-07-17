"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  type MoleculeRecord,
  MoleculeRenderer,
  type RouteHint,
  useMoleculeCatalog,
} from "@repo/gen-engine";
import { useMemo, useState } from "react";
import { GenerativeCanvas } from "./generative-canvas";
import { moleculeCatalogClient } from "./molecule-catalog-client";

const ROUTE_HINTS: RouteHint[] = [
  "dashboard",
  "visualization",
  "component",
  "audit",
];

function CatalogSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function MoleculeListItem({
  molecule,
  isSelected,
  onSelect,
}: {
  molecule: MoleculeRecord;
  isSelected: boolean;
  onSelect: (moleculeId: string) => void;
}) {
  return (
    <button
      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-transparent hover:bg-muted/60"
      }`}
      onClick={() => onSelect(molecule.id)}
      type="button"
    >
      <div className="font-medium">{molecule.name}</div>
      <div className="text-muted-foreground text-xs">
        {molecule.genUItier} · {molecule.route_hint ?? "dashboard"}
      </div>
    </button>
  );
}

export function MoleculeWorkbench() {
  const {
    data: catalog,
    isLoading,
    error,
  } = useMoleculeCatalog(moleculeCatalogClient);
  const [query, setQuery] = useState("");
  const [routeHint, setRouteHint] = useState<RouteHint | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!catalog) {
      return [];
    }
    const normalized = query.trim().toLowerCase();
    return catalog.molecules.filter((molecule) => {
      if (routeHint !== "all" && molecule.route_hint !== routeHint) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      const haystack = [
        molecule.id,
        molecule.name,
        molecule.description,
        ...molecule.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [catalog, query, routeHint]);

  const selectedMolecule =
    filtered.find((molecule) => molecule.id === selectedId) ??
    filtered[0] ??
    catalog?.molecules[0] ??
    null;

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Failed to load molecule catalog. Run{" "}
        <code className="rounded bg-muted px-1">yarn molecule-index</code>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(300px,380px)]">
      <aside className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold text-sm">Molecule catalog</h2>
        <Input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, tag, route…"
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-2 py-1 text-xs ${
              routeHint === "all" ? "border-primary bg-primary/10" : ""
            }`}
            onClick={() => setRouteHint("all")}
            type="button"
          >
            all
          </button>
          {ROUTE_HINTS.map((hint) => (
            <button
              className={`rounded-full border px-2 py-1 text-xs ${
                routeHint === hint ? "border-primary bg-primary/10" : ""
              }`}
              key={hint}
              onClick={() => setRouteHint(hint)}
              type="button"
            >
              {hint}
            </button>
          ))}
        </div>
        {isLoading ? (
          <CatalogSkeleton />
        ) : (
          <div className="max-h-[32rem] space-y-1 overflow-y-auto">
            {filtered.map((molecule) => (
              <MoleculeListItem
                isSelected={selectedMolecule?.id === molecule.id}
                key={molecule.id}
                molecule={molecule}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </aside>

      <section className="min-h-[28rem] space-y-2">
        <h2 className="font-semibold text-sm">Molecule preview</h2>
        {selectedMolecule ? (
          <MoleculeRenderer molecule={selectedMolecule} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Select a molecule to preview.
          </p>
        )}
      </section>

      <aside className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="font-semibold text-sm">Generative canvas</h2>
          <p className="text-muted-foreground text-xs">
            WebSocket agent panel (strangler — Phase 4 cutover deferred).
          </p>
        </div>
        <GenerativeCanvas />
      </aside>
    </div>
  );
}
