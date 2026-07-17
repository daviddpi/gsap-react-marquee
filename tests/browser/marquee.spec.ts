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

test("normalizes invalid numeric props before creating GSAP animations", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      delay: Number.NEGATIVE_INFINITY,
      loop: Number.NaN,
      scrollFollow: true,
      scrollSpeed: Number.POSITIVE_INFINITY,
      spacing: -10,
      speed: 0,
    });
  });

  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.timelineCount()))
    .toBeGreaterThan(0);

  const durations = await page.evaluate(() =>
    window.__marqueeFixture.timelineDurations()
  );
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((duration) => Number.isFinite(duration))).toBe(true);
  expect(durations.every((duration) => duration >= 0)).toBe(true);
});

test("waits for horizontal content to gain a positive width", async ({ page }) => {
  await page.goto("/?contentWidth=0");
  await expect(page.locator(".gsap-react-marquee-container")).toBeAttached();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  expect(
    await page.evaluate(() => window.__marqueeFixture.timelineCount())
  ).toBe(0);

  await page.evaluate(() => window.__marqueeFixture.setContentSize(160, 40));
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.timelineCount()))
    .toBeGreaterThan(0);
});

test("waits for vertical content to gain a positive height", async ({ page }) => {
  await page.goto("/?contentHeight=0&dir=up");
  await expect(page.locator(".gsap-react-marquee-container")).toBeAttached();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  expect(
    await page.evaluate(() => window.__marqueeFixture.timelineCount())
  ).toBe(0);

  await page.evaluate(() => window.__marqueeFixture.setContentSize(160, 40));
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.timelineCount()))
    .toBeGreaterThan(0);
});

test("initializes after an initially hidden container becomes visible", async ({
  page,
}) => {
  await page.goto("/?hidden=1");
  await expect(page.locator(".gsap-react-marquee-container")).toBeAttached();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  expect(
    await page.evaluate(() => window.__marqueeFixture.timelineCount())
  ).toBe(0);

  await page.evaluate(() => window.__marqueeFixture.setDisplay("block"));
  await expect(page.locator(".gsap-react-marquee-container")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.timelineCount()))
    .toBeGreaterThan(0);
});
