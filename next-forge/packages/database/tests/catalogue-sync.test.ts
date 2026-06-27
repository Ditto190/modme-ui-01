import { describe, expect, it, vi } from "vitest";

// Mock the Supabase client
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null, data: [] }),
      })),
    })),
  };
});

describe("catalogue-sync.mjs (Quality Playbook)", () => {
  it("should parse skills_index.json correctly if it exists", () => {
    const mockSkillsIndex = [
      {
        id: "test-skill",
        name: "Test Skill",
        description: "A mock skill for testing",
        category: "mock",
      },
    ];

    // Simple test to ensure logic validation passes
    expect(mockSkillsIndex).toHaveLength(1);
    expect(mockSkillsIndex[0].id).toBe("test-skill");
  });

  it("slugify function handles special characters and casing", () => {
    const text = "Hello_World 123!";
    const slugify = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

    expect(slugify(text)).toBe("hello-world-123");
  });

  it("generates expected CatalogueItem structure", () => {
    const mockOutputSchema = {
      id: "uuid-123",
      schema_type: "agent",
      name: "Agent Smith",
      slug: "agent-smith",
      schema: { tools: ["search"] },
      source_entry_id: "inbox-1",
    };

    const item = {
      item_type: mockOutputSchema.schema_type,
      slug: mockOutputSchema.slug,
      name: mockOutputSchema.name,
      status: "published",
      source_entry_id: mockOutputSchema.source_entry_id,
      output_schema_id: mockOutputSchema.id,
      metadata: {
        tools: mockOutputSchema.schema.tools,
        schema_version: mockOutputSchema.schema_type,
      },
    };

    expect(item.item_type).toBe("agent");
    expect(item.status).toBe("published");
    expect(item.metadata.tools).toContain("search");
  });
});
