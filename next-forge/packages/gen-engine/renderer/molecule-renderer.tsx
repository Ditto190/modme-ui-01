"use client";

import { useMemo, useState } from "react";
import type { MoleculeRecord } from "../catalog/types";
import { compileDeclarativeForm } from "../forms/declarative-form-compiler";
import { DeclarativePreview } from "./declarative-preview";
import { OpenEndedPreview } from "./open-ended-preview";
import { StaticPreview } from "./static-preview";

export interface MoleculeRendererProps {
  molecule: MoleculeRecord;
  onValuesChange?: (values: Record<string, unknown>) => void;
  values?: Record<string, unknown>;
}

export function MoleculeRenderer({
  molecule,
  values: controlledValues,
  onValuesChange,
}: MoleculeRendererProps) {
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  const values = controlledValues ?? localValues;
  const setValues = onValuesChange ?? setLocalValues;

  const declarativeDescriptor = useMemo(
    () =>
      molecule.genUItier === "declarative"
        ? compileDeclarativeForm({
            toolName: molecule.name,
            toolDescription: molecule.description,
            parameterSchema: molecule.parameterSchema,
            autoSubmit: false,
          })
        : null,
    [molecule]
  );

  switch (molecule.genUItier) {
    case "static":
      return <StaticPreview molecule={molecule} values={values} />;
    case "declarative":
      return declarativeDescriptor ? (
        <DeclarativePreview
          descriptor={declarativeDescriptor}
          molecule={molecule}
          onValuesChange={setValues}
          values={values}
        />
      ) : null;
    case "open-ended":
      return <OpenEndedPreview molecule={molecule} />;
    default:
      return null;
  }
}
