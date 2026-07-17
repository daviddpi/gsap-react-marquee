import { expect, test, type Page } from "@playwright/test";

const marqueeItems = (page: Page) =>
  page.locator(".gsap-react-marquee-container > .gsap-react-marquee");

const measureLoopGaps = async (
  page: Page,
  isVertical: boolean
): Promise<{ cycleDuration: number; frames: number; maxGap: number }> => {
  return page.evaluate(async ({ vertical }) => {
    const root = document.querySelector<HTMLElement>(
      ".gsap-react-marquee-container"
    );
    if (!root) throw new Error("Marquee root is missing");

    const durations = window.__marqueeFixture
      .timelineDurations()
      .filter((duration) => Number.isFinite(duration) && duration > 0);
    const cycleDuration = Math.max(...durations);
    if (!Number.isFinite(cycleDuration)) {
      return { cycleDuration, frames: 0, maxGap: Number.POSITIVE_INFINITY };
    }

    const endTime = performance.now() + cycleDuration * 2_000;
    let frames = 0;
    let maxGap = 0;

    do {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const rootRect = root.getBoundingClientRect();
      const rootStart = vertical ? rootRect.top : rootRect.left;
      const rootEnd = vertical ? rootRect.bottom : rootRect.right;
      const intervals = Array.from(
        root.querySelectorAll<HTMLElement>(".gsap-react-marquee-content")
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            end: vertical ? rect.bottom : rect.right,
            start: vertical ? rect.top : rect.left,
          };
        })
        .filter(({ end, start }) => end > rootStart && start < rootEnd)
        .sort((first, second) => first.start - second.start);

      let coveredUntil = rootStart;
      for (const interval of intervals) {
        maxGap = Math.max(maxGap, interval.start - coveredUntil);
        coveredUntil = Math.max(coveredUntil, interval.end);
      }
      maxGap = Math.max(maxGap, rootEnd - coveredUntil);
      frames += 1;
    } while (performance.now() < endTime);

    return { cycleDuration, frames, maxGap };
  }, { vertical: isVertical });
};

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

test("unconstrained vertical measurement converges without clone growth", async ({
  page,
}) => {
  await page.goto("/?dir=up");
  await expect(page.locator(".gsap-react-marquee-container")).toBeVisible();

  const samples = await page.evaluate(async () => {
    const values: Array<{ cloneCount: number; rootSize: number }> = [];

    for (let frame = 0; frame < 16; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const root = document.querySelector<HTMLElement>(
        ".gsap-react-marquee-container"
      );
      if (!root) continue;

      values.push({
        cloneCount: Math.max(
          0,
          root.querySelectorAll(":scope > .gsap-react-marquee").length - 1
        ),
        rootSize: root.offsetHeight,
      });
    }

    return values;
  });

  const observedCloneCounts = new Set(samples.map(({ cloneCount }) => cloneCount));
  const stableTailSizes = new Set(
    samples.slice(-5).map(({ rootSize }) => rootSize)
  );

  expect(samples.length).toBe(16);
  expect(observedCloneCounts.size).toBeLessThanOrEqual(2);
  expect(samples.at(-1)?.cloneCount).toBeLessThan(15);
  expect(stableTailSizes.size).toBe(1);
});

test("accepts an external viewport resize after clone application", async ({
  page,
}) => {
  await page.evaluate(() => window.__marqueeFixture.render({ fill: true }));

  const readCloneCount = () =>
    page.locator(
      ".gsap-react-marquee-container > .gsap-react-marquee"
    ).count();

  await expect.poll(readCloneCount).toBe(5);

  await page.evaluate(() => window.__marqueeFixture.setContainerSize(480, 160));
  await expect.poll(readCloneCount).toBe(4);

  const stableCounts = await page.evaluate(async () => {
    const counts: number[] = [];
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      counts.push(
        document.querySelectorAll(
          ".gsap-react-marquee-container > .gsap-react-marquee"
        ).length
      );
    }
    return counts;
  });

  expect(new Set(stableCounts)).toEqual(new Set([4]));
});

test("keeps vertical measurement stable under React StrictMode", async ({
  page,
}) => {
  await page.goto("/?dir=up&strict=1");
  await expect(page.locator(".gsap-react-marquee-container")).toBeVisible();

  const samples = await page.evaluate(async () => {
    const values: Array<{ cloneCount: number; rootSize: number }> = [];
    for (let frame = 0; frame < 10; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const root = document.querySelector<HTMLElement>(
        ".gsap-react-marquee-container"
      );
      if (!root) continue;
      values.push({
        cloneCount: Math.max(
          0,
          root.querySelectorAll(":scope > .gsap-react-marquee").length - 1
        ),
        rootSize: root.offsetHeight,
      });
    }
    return values;
  });

  expect(samples.length).toBe(10);
  expect(samples.at(-1)?.cloneCount).toBeLessThan(15);
  expect(new Set(samples.slice(-5).map(({ rootSize }) => rootSize)).size).toBe(1);
});

test("fill=false keeps one original and one duplicate for every direction", async ({
  page,
}) => {
  for (const dir of ["left", "right", "up", "down"] as const) {
    await page.evaluate((nextDirection) => {
      window.__marqueeFixture.render({ dir: nextDirection, fill: false });
    }, dir);
    await expect.poll(() => marqueeItems(page).count()).toBe(2);
  }
});

test("vertical fill covers a fixed viewport equally for up and down", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.setContainerSize(800, 320);
    window.__marqueeFixture.render({
      containerStyle: { height: "100%" },
      dir: "up",
      fill: true,
    });
  });
  await expect.poll(() => marqueeItems(page).count()).toBe(7);

  await page.evaluate(() => {
    window.__marqueeFixture.render({
      containerStyle: { height: "100%" },
      dir: "down",
      fill: true,
    });
  });
  await expect.poll(() => marqueeItems(page).count()).toBe(7);
});

test("constrained vertical resize produces one new stable clone count", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.setContainerSize(800, 320);
    window.__marqueeFixture.render({
      containerStyle: { height: "100%" },
      dir: "up",
      fill: true,
    });
  });
  await expect.poll(() => marqueeItems(page).count()).toBe(7);

  await page.evaluate(() => window.__marqueeFixture.setContainerSize(800, 480));
  await expect.poll(() => marqueeItems(page).count()).toBe(10);

  const stableCounts = await page.evaluate(async () => {
    const counts: number[] = [];
    for (let frame = 0; frame < 8; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      counts.push(
        document.querySelectorAll(
          ".gsap-react-marquee-container > .gsap-react-marquee"
        ).length
      );
    }
    return counts;
  });
  expect(new Set(stableCounts)).toEqual(new Set([10]));
});

for (const spacing of [0, 16, 80]) {
  test(`horizontal fill remains seamless for two cycles with spacing ${spacing}`, async ({
    page,
  }) => {
    await page.evaluate((nextSpacing) => {
      window.__marqueeFixture.setContainerSize(800, 320);
      window.__marqueeFixture.render({
        fill: true,
        spacing: nextSpacing,
        speed: 2_000,
      });
    }, spacing);

    const expectedItems = spacing === 80 ? 5 : 6;
    await expect.poll(() => marqueeItems(page).count()).toBe(expectedItems);
    await expect
      .poll(() => page.evaluate(() => window.__marqueeFixture.timelineCount()))
      .not.toBe(0);
    const result = await measureLoopGaps(page, false);
    expect(result.cycleDuration).toBeGreaterThan(0);
    expect(result.frames).toBeGreaterThanOrEqual(8);
    expect(result.maxGap).toBeLessThanOrEqual(spacing + 2);
  });
}

test("vertical fill remains seamless for two cycles", async ({ page }) => {
  await page.evaluate(() => {
    window.__marqueeFixture.setContainerSize(800, 320);
    window.__marqueeFixture.render({
      containerStyle: { height: "100%" },
      dir: "up",
      fill: true,
      speed: 2_000,
    });
  });

  await expect.poll(() => marqueeItems(page).count()).toBe(7);
  const result = await measureLoopGaps(page, true);
  expect(result.cycleDuration).toBeGreaterThan(0);
  expect(result.frames).toBeGreaterThanOrEqual(8);
  expect(result.maxGap).toBeLessThanOrEqual(18);
});

test("duplicate ceiling stays finite and warns once in development", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && message.text().includes("maxDuplicates")) {
      warnings.push(message.text());
    }
  });

  await page.evaluate(() => {
    window.__marqueeFixture.setContentSize(1, 1);
    window.__marqueeFixture.render({
      fill: true,
      maxDuplicates: 3,
      spacing: 0,
    });
  });
  await expect.poll(() => marqueeItems(page).count()).toBe(4);

  await page.evaluate(() => {
    window.__marqueeFixture.setContainerSize(800, 160);
    window.__marqueeFixture.render({
      fill: true,
      maxDuplicates: 3,
      spacing: 0,
    });
  });
  await page.waitForTimeout(50);

  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toContain("maxDuplicates=3");
});
