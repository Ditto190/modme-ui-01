import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/inbox
 * Query inbox entries with filters
 *
 * Query params:
 *   q        — text search (title + summary)
 *   format   — source format filter
 *   type     — entry type filter
 *   severity — severity filter (low|medium|high|critical)
 *   status   — status filter (indexed|categorized|archived)
 *   tags     — comma-separated tag filter
 *   limit    — max results (default 20, max 100)
 *   cursor   — pagination cursor (created_at ISO string)
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? undefined;
  const format = searchParams.get("format") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const severity = searchParams.get("severity") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const tagsParam = searchParams.get("tags");
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") ?? undefined;

  const limit = Math.min(Number(limitParam) || 20, 100);
  const tags = tagsParam
    ? tagsParam.split(",").map((t) => t.trim())
    : undefined;

  try {
    const where = {
      ...(format && { sourceFormat: format }),
      ...(type && { entryType: type }),
      ...(severity && { severity }),
      ...(status && { status }),
      ...(tags?.length && { tags: { hasSome: tags } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { summary: { contains: q, mode: "insensitive" as const } },
          { extractedText: { contains: q, mode: "insensitive" as const } },
        ],
      }),
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const entries = await database.inboxEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        id: true,
        sourceFile: true,
        sourceFormat: true,
        title: true,
        summary: true,
        tags: true,
        entryType: true,
        severity: true,
        status: true,
        agentName: true,
        agentRole: true,
        branchName: true,
        categoryId: true,
        createdAt: true,
        category: {
          select: { name: true, slug: true },
        },
      },
    });

    const hasMore = entries.length > limit;
    const data = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore
      ? data.at(-1)?.createdAt.toISOString()
      : undefined;

    return NextResponse.json({ data, nextCursor, hasMore });
  } catch (error) {
    console.error("[inbox] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
