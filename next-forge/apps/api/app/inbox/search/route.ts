import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const SearchBodySchema = z.object({
  query: z.string().min(1).max(2000),
  mode: z.enum(["text", "semantic"]).default("text"),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

type SearchRow = {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  entry_type: string | null;
  severity: string;
  source_file: string;
  similarity: number | null;
};

/**
 * POST /api/inbox/search
 * Text or full-text semantic search over inbox entries.
 *
 * Body: { query, mode?: "text"|"semantic", limit?, threshold? }
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SearchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { query, mode, limit } = parsed.data;

  try {
    if (mode === "text") {
      const entries = await database.inboxEntry.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { extractedText: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          summary: true,
          tags: true,
          entryType: true,
          severity: true,
          sourceFile: true,
        },
      });

      return NextResponse.json({
        data: entries.map((e) => ({ ...e, similarity: null })),
        mode: "text",
      });
    }

    const rows = await database.$queryRawUnsafe<SearchRow[]>(
      `SELECT
         ie.id,
         ie.title,
         ie.summary,
         ie.tags,
         ie.entry_type,
         ie.severity,
         ie.source_file,
         ts_rank(
           to_tsvector('english', COALESCE(ie.extracted_text, '') || ' ' || COALESCE(ie.title, '')),
           plainto_tsquery('english', $1)
         ) AS similarity
       FROM inbox_entries ie
       WHERE to_tsvector('english', COALESCE(ie.extracted_text, '') || ' ' || COALESCE(ie.title, ''))
         @@ plainto_tsquery('english', $1)
       ORDER BY similarity DESC
       LIMIT $2`,
      query,
      limit
    );

    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        tags: row.tags,
        entryType: row.entry_type,
        severity: row.severity,
        sourceFile: row.source_file,
        similarity: row.similarity,
      })),
      mode: "semantic",
    });
  } catch (error) {
    console.error("[inbox/search] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
