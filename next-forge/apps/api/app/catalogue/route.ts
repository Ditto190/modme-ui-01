import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SCHEMA_TYPES = new Set([
  "skill",
  "agent",
  "component",
  "doc",
  "storybook",
]);
const STATUSES = new Set(["draft", "published", "archived"]);

/**
 * GET /catalogue
 * Query output schemas and artefacts (published by default).
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") ?? undefined;
  if (type && !SCHEMA_TYPES.has(type)) {
    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 }
    );
  }

  const statusParam = searchParams.get("status") ?? "published";
  if (!STATUSES.has(statusParam)) {
    return NextResponse.json(
      { error: "Invalid status parameter" },
      { status: 400 }
    );
  }

  // Public callers may only read published artefacts
  const status = statusParam === "published" ? statusParam : "published";

  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(limitParam, 100))
    : 20;

  try {
    const schemas = await database.outputSchema.findMany({
      where: {
        ...(type && { schemaType: type }),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        artefacts: {
          where: { status },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            artefactType: true,
            title: true,
            status: true,
            filePath: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ data: schemas });
  } catch (error) {
    console.error("[catalogue] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
