import { z } from "zod";

export interface DeclarativeFormCompileInput {
  autoSubmit?: boolean;
  parameterSchema: Record<string, unknown>;
  toolDescription: string;
  toolName: string;
}

export interface DeclarativeToolDescriptor {
  autoSubmit: boolean;
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
  zodSchema: z.ZodTypeAny;
}

interface JsonSchemaProperty {
  description?: string;
  enum?: unknown[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  type?: string;
}

function zodFromJsonProperty(property: JsonSchemaProperty): z.ZodTypeAny {
  if (property.enum?.length) {
    const values = property.enum as [string, ...string[]];
    return z.enum(values);
  }

  switch (property.type) {
    case "boolean":
      return z.boolean();
    case "number":
    case "integer":
      return z.number();
    case "array":
      return z.array(
        property.items ? zodFromJsonProperty(property.items) : z.unknown()
      );
    case "object":
      return zodFromJsonObject(property);
    default:
      return z.string();
  }
}

function zodFromJsonObject(
  schema: JsonSchemaProperty
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set(schema.required ?? []);

  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    let field: z.ZodTypeAny = zodFromJsonProperty(property);
    if (property.description) {
      field = field.describe(property.description);
    }
    if (!required.has(key)) {
      field = field.optional();
    }
    shape[key] = field;
  }

  return z.object(shape);
}

export function compileDeclarativeForm(
  input: DeclarativeFormCompileInput
): DeclarativeToolDescriptor {
  const schema = input.parameterSchema as JsonSchemaProperty;
  const zodSchema = zodFromJsonObject(schema);

  const properties: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    properties[key] = {
      type: property.type ?? "string",
      description: property.description,
      ...(property.enum ? { enum: property.enum } : {}),
    };
  }

  return {
    name: input.toolName,
    description: input.toolDescription,
    autoSubmit: input.autoSubmit ?? false,
    inputSchema: {
      type: "object",
      properties,
      required: schema.required ?? [],
    },
    zodSchema,
  };
}

export function parseDeclarativeFormValues(
  descriptor: DeclarativeToolDescriptor,
  values: unknown
) {
  return descriptor.zodSchema.safeParse(values);
}

export const TOOL_FORM_ACTIVE_ATTR = "data-tool-form-active";
export const TOOL_SUBMIT_ACTIVE_ATTR = "data-tool-submit-active";

export const declarativeFormStateSelectors = {
  formActive: `[${TOOL_FORM_ACTIVE_ATTR}="true"]`,
  submitActive: `[${TOOL_SUBMIT_ACTIVE_ATTR}="true"]`,
} as const;
