import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/catalogue
 * Query output schemas and artefacts
 *
 * Query params:
 *   type     — schema type filter (skill|agent|component|doc|storybook)
 *   status   — artefact status (draft|published|archived)
 *   limit    — max results (default 20, max 100)
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? "published";
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Number(limitParam) || 20, 100);

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
