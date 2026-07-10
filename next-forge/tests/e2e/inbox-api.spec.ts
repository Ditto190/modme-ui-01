import { expect, test } from "@playwright/test";

test.describe("Inbox API smoke", () => {
  test("GET /inbox returns paginated inbox payload", async ({ request }) => {
    const response = await request.get("/inbox");

    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      data: unknown[];
      hasMore: boolean;
      nextCursor?: string;
    };

    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.hasMore).toBe("boolean");
  });

  test("GET /inbox accepts limit query param", async ({ request }) => {
    const response = await request.get("/inbox?limit=5");

    expect(response.status()).toBe(200);

    const body = (await response.json()) as { data: unknown[] };
    expect(body.data.length).toBeLessThanOrEqual(5);
  });
});
