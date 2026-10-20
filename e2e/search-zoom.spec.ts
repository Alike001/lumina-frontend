import { expect, test } from "@playwright/test";

const LONG_QUERY = "x".repeat(180);

async function expectNoPageOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    dimensions.scrollWidth,
    "the document must not scroll horizontally",
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe("search reflow at a narrow CSS viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the no-query page within the viewport and its links reachable", async ({
    page,
  }) => {
    await page.goto("/search");

    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expectNoPageOverflow(page);

    // The navbar is intentionally independently scrollable on narrow screens;
    // focusing a route link proves it remains in the keyboard reachability tree.
    const explorer = page.getByRole("link", { name: "Explorer", exact: true });
    await explorer.focus();
    await expect(explorer).toBeFocused();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("keeps a long-query result page from widening the document", async ({
    page,
  }) => {
    await page.goto(`/search?q=${encodeURIComponent(LONG_QUERY)}`);

    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expectNoPageOverflow(page);

    const results = page.getByRole("region", { name: "Search results" });
    if ((await results.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description:
          "The configured backend returned no result rows; table scrolling is covered when seeded data is available.",
      });
      return;
    }

    await results.focus();
    await expect(results).toBeFocused();
    expect(
      await results.evaluate((element) => element.scrollWidth),
    ).toBeGreaterThan(await results.evaluate((element) => element.clientWidth));
    await expectNoPageOverflow(page);
  });
});
