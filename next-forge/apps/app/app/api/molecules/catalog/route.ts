import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadMoleculeCatalog,
  parseMoleculeCatalog,
} from "@repo/gen-engine/server";
import { NextResponse } from "next/server";

function readCatalogFromDisk() {
  const catalogPath = resolve(
    process.cwd(),
    "../../packages/gen-engine/catalog/catalog.v1.json"
  );
  try {
    const raw = readFileSync(catalogPath, "utf8");
    return parseMoleculeCatalog(JSON.parse(raw));
  } catch {
    return loadMoleculeCatalog();
  }
}

export function GET() {
  try {
    const catalog = readCatalogFromDisk();
    return NextResponse.json({ data: catalog });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CATALOG_UNAVAILABLE",
          message:
            error instanceof Error
              ? error.message
              : "Molecule catalog unavailable",
          status: 503,
        },
      },
      { status: 503 }
    );
  }
}
