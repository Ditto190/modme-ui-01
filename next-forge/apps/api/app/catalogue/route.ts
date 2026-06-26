import { database } from "@repo/database";
import {
  CatalogueListQuerySchema,
  type CatalogueItemRecord,
} from "@repo/schemas/catalogue";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function toRecord(row: {
  id: string;
  itemType: string;
  slug: string;
  name: string;
  description: string | null;
  taxonomyCode: string | null;
  status: string;
  sourceEntryId: string | null;
  outputSchemaId: string | null;
  metadata: unknown;
  popularityScore: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CatalogueItemRecord {
  return {
    id: row.id,
    item_type: row.itemType as CatalogueItemRecord["item_type"],
    slug: row.slug,
    name: row.name,
    description: row.description,
    taxonomy_code: row.taxonomyCode,
    status: row.status as CatalogueItemRecord["status"],
    source_entry_id: row.sourceEntryId,
    output_schema_id: row.outputSchemaId,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    popularity_score: row.popularityScore,
    published_at: row.publishedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/**
 * GET /api/catalogue
 * Query catalogue_items registry (ADR-0010)
 *
 * Query params:
 *   action  — list | popular | search (default list)
 *   type    — item_type filter
 *   status  — draft | published | archived (default published)
 *   q       — search query (search action)
 *   limit   — max results (default 20, max 100)
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);

  const parsed = CatalogueListQuerySchema.safeParse({
    action: searchParams.get("action") ?? "list",
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? "published",
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ?? "20",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { action, type, status, q, limit } = parsed.data;

  try {
    if (action === "popular") {
      const items = await database.catalogueItem.findMany({
        where: {
          status,
          ...(type && { itemType: type }),
          popularityScore: { not: null },
        },
        orderBy: [{ popularityScore: "desc" }, { updatedAt: "desc" }],
        take: limit,
      });

      return NextResponse.json({ data: items.map(toRecord) });
    }

    if (action === "search" && q) {
      const items = await database.catalogueItem.findMany({
        where: {
          status,
          ...(type && { itemType: type }),
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

      return NextResponse.json({ data: items.map(toRecord) });
    }

    const items = await database.catalogueItem.findMany({
      where: {
        status,
        ...(type && { itemType: type }),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: items.map(toRecord) });
  } catch (error) {
    console.error("[catalogue] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
