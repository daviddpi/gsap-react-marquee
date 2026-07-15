import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".gsap-react-marquee-container")).toBeVisible();
});

test("uses exact fixture dimensions and creates finite animation segments", async ({
  page,
}) => {
  const fixture = page.locator("#fixture");
  await expect(fixture).toHaveCSS("width", "640px");
  await expect(fixture).toHaveCSS("height", "160px");

  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.timelineDurations()))
    .toContainEqual(expect.any(Number));

  const durations = await page.evaluate(() =>
    window.__marqueeFixture.timelineDurations()
  );
  expect(durations.some((duration) => duration > 0)).toBe(true);
  expect(durations.every(Number.isFinite)).toBe(true);
});

test("updates rendered props without remounting the fixture", async ({ page }) => {
  const root = page.locator(".gsap-react-marquee-container");
  await expect(root).not.toHaveClass(/gsap-react-marquee-vertical/);

  await page.evaluate(() => {
    window.__marqueeFixture.render({
      className: "browser-updated-content",
      dir: "up",
    });
  });

  await expect(root).toHaveClass(/gsap-react-marquee-vertical/);
  await expect(page.locator(".browser-updated-content").first()).toBeVisible();
});

test("responds to explicit container dimensions", async ({ page }) => {
  await page.evaluate(() => {
    window.__marqueeFixture.setContainerSize(480, 120);
  });

  await expect(page.locator("#fixture")).toHaveCSS("width", "480px");
  await expect(page.locator("#fixture")).toHaveCSS("height", "120px");
});
