"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import type { MoleculeRecord } from "../catalog/types";

export interface OpenEndedPreviewProps {
  molecule: MoleculeRecord;
}

export function OpenEndedPreview({ molecule }: OpenEndedPreviewProps) {
  const html = `<section><h2>${molecule.name}</h2><p>${molecule.description}</p><pre>${JSON.stringify(molecule.parameterSchema, null, 2)}</pre></section>`;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <Badge variant="outline">open-ended sandbox</Badge>
      <iframe
        className="h-64 w-full rounded-md border bg-background"
        sandbox=""
        srcDoc={html}
        title={`${molecule.id} preview`}
      />
    </div>
  );
}
