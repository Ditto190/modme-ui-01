import { expect, test } from "@playwright/test";
import { signInApp } from "./auth";

const CONNECTION_STATUS_RE = /Connected|Disconnected/;

test.describe("Generative UI canvas shell", () => {
  test.beforeEach(async ({ page }) => {
    await signInApp(page, "/generative-ui");
  });

  test("authenticated route renders canvas shell and connection status", async ({
    page,
  }) => {
    expect(page.url()).toContain("/generative-ui");

    await expect(
      page.getByRole("heading", { name: "Generative UI", exact: true })
    ).toBeVisible();

    await expect(page.getByText(CONNECTION_STATUS_RE)).toBeVisible();

    await expect(
      page.getByPlaceholder("Describe the UI you want…")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

    await expect(
      page.getByText("Send a message to generate UI components from the agent.")
    ).toBeVisible();
  });
});
