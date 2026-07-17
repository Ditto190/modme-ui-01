"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { type ChangeEvent, type FormEvent, useState } from "react";
import type { MoleculeRecord } from "../catalog/types";
import type { DeclarativeToolDescriptor } from "../forms/declarative-form-compiler";

export interface DeclarativePreviewProps {
  descriptor: DeclarativeToolDescriptor;
  molecule: MoleculeRecord;
  onValuesChange?: (values: Record<string, unknown>) => void;
  values: Record<string, unknown>;
}

export function DeclarativePreview({
  molecule,
  descriptor,
  values,
  onValuesChange,
}: DeclarativePreviewProps) {
  const [isSubmitActive, setIsSubmitActive] = useState(false);

  function handleChange(key: string, value: string) {
    onValuesChange?.({ ...values, [key]: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitActive(true);
    window.setTimeout(() => setIsSubmitActive(false), 1200);
  }

  const properties = descriptor.inputSchema.properties ?? {};

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-6 data-[tool-form-active=true]:ring-2 data-[tool-form-active=true]:ring-primary/40 data-[tool-submit-active=true]:ring-emerald-500/50"
      data-tool-form-active="true"
      data-tool-submit-active={isSubmitActive ? "true" : "false"}
      data-tooldescription={descriptor.description}
      data-toolname={descriptor.name}
      {...(descriptor.autoSubmit ? { "data-toolautosubmit": "true" } : {})}
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <h3 className="font-semibold text-lg">{descriptor.name}</h3>
        <p className="text-muted-foreground text-sm">
          {descriptor.description}
        </p>
      </div>
      {Object.entries(properties).map(([key, schema]) => (
        <div className="grid gap-2" key={key}>
          <Label htmlFor={`${molecule.id}-${key}`}>{key}</Label>
          <Input
            data-toolparamdescription={
              (schema as { description?: string }).description
            }
            id={`${molecule.id}-${key}`}
            name={key}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange(key, event.target.value)
            }
            placeholder={(schema as { description?: string }).description}
            value={String(values[key] ?? "")}
          />
        </div>
      ))}
      <Button type="submit">Run {molecule.name}</Button>
    </form>
  );
}
