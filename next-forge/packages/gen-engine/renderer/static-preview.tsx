"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import type { MoleculeRecord } from "../catalog/types";

export interface StaticPreviewProps {
  molecule: MoleculeRecord;
  values: Record<string, unknown>;
}

export function StaticPreview({ molecule, values }: StaticPreviewProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg">{molecule.name}</h3>
        <Badge variant="secondary">{molecule.genUItier}</Badge>
      </div>
      <p className="text-muted-foreground text-sm">{molecule.description}</p>
      <dl className="grid gap-2 text-sm">
        {Object.entries(molecule.parameterSchema.properties ?? {}).map(
          ([key, schema]) => (
            <div className="grid gap-1" key={key}>
              <dt className="font-medium">{key}</dt>
              <dd>
                <Input
                  readOnly
                  value={String(
                    values[key] ?? (schema as { type?: string }).type ?? ""
                  )}
                />
              </dd>
            </div>
          )
        )}
      </dl>
      {molecule.constraints.length > 0 ? (
        <ul className="list-inside list-disc text-muted-foreground text-xs">
          {molecule.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
