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

    let cycleDuration = Number.NaN;
    let stableDurationFrames = 0;
    for (let frame = 0; frame < 60 && stableDurationFrames < 3; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const durations = window.__marqueeFixture
        .timelineDurations()
        .filter((duration) => Number.isFinite(duration) && duration > 0);
      const nextDuration = Math.max(...durations);

      if (Number.isFinite(nextDuration)) {
        cycleDuration = nextDuration;
        stableDurationFrames += 1;
      } else {
        stableDurationFrames = 0;
      }
    }
    if (!Number.isFinite(cycleDuration)) {
      return { cycleDuration, frames: 0, maxGap: Number.POSITIVE_INFINITY };
    }

    const endTime = performance.now() + cycleDuration * 2_000;
    const minimumFrames = 8;
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
    } while (performance.now() < endTime || frames < minimumFrames);

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

test("equivalent parent rerender preserves timeline and listeners", async ({
  page,
}) => {
  const options = {
    pauseOnHover: true,
    paused: true,
    scrollFollow: true,
  };
  await page.evaluate((nextOptions) => {
    window.__marqueeFixture.render(nextOptions);
  }, options);
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.baseTimelineState()))
    .not.toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.marqueeListenerCount())
    )
    .toBe(4);

  const before = await page.evaluate(() => ({
    listeners: window.__marqueeFixture.marqueeListenerCount(),
    resources: window.__marqueeFixture.resourceCounts(),
    timeline: window.__marqueeFixture.baseTimelineState(),
  }));

  await page.evaluate((nextOptions) => {
    window.__marqueeFixture.render({ ...nextOptions });
  }, options);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );

  const after = await page.evaluate(() => ({
    listeners: window.__marqueeFixture.marqueeListenerCount(),
    resources: window.__marqueeFixture.resourceCounts(),
    timeline: window.__marqueeFixture.baseTimelineState(),
  }));

  expect(before.listeners).toBe(4);
  expect(after.listeners).toBe(before.listeners);
  expect(after.resources).toEqual(before.resources);
  expect(after.timeline?.identity).toBe(before.timeline?.identity);
  expect(after.timeline?.totalTime).toBe(before.timeline?.totalTime);
});

test("actual content resize replaces the timeline once", async ({ page }) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({ paused: true });
  });
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.baseTimelineState()))
    .not.toBeNull();

  const previousIdentity = await page.evaluate(
    () => window.__marqueeFixture.baseTimelineState()?.identity
  );
  await page.evaluate(() => window.__marqueeFixture.setContentSize(240, 40));

  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__marqueeFixture.baseTimelineState()?.identity
        )
    )
    .not.toBe(previousIdentity);
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 1, observers: 0, taggedAnimations: 1 });

  const stableIdentities = await page.evaluate(async () => {
    const identities: number[] = [];
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const identity = window.__marqueeFixture.baseTimelineState()?.identity;
      if (identity !== undefined) identities.push(identity);
    }
    return identities;
  });

  expect(new Set(stableIdentities).size).toBe(1);
  expect(stableIdentities[0]).not.toBe(previousIdentity);
});

test("primitive animation option changes rebuild controlled behavior", async ({
  page,
}) => {
  const options = {
    dir: "left" as const,
    fill: false,
    loop: -1,
    paused: true,
    spacing: 16,
    speed: 100,
  };
  await page.evaluate((nextOptions) => {
    window.__marqueeFixture.render(nextOptions);
  }, options);
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.baseTimelineState()))
    .not.toBeNull();

  let previousIdentity = await page.evaluate(
    () => window.__marqueeFixture.baseTimelineState()?.identity
  );
  const updates = [
    { speed: 200 },
    { dir: "right" as const },
    { loop: 2 },
    { spacing: 32 },
    { fill: true },
    { paused: false },
  ];

  for (const update of updates) {
    Object.assign(options, update);
    await page.evaluate((nextOptions) => {
      window.__marqueeFixture.render(nextOptions);
    }, options);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__marqueeFixture.baseTimelineState()?.identity
          )
      )
      .not.toBe(previousIdentity);
    previousIdentity = await page.evaluate(
      () => window.__marqueeFixture.baseTimelineState()?.identity
    );
  }

  const finalState = await page.evaluate(() => ({
    itemCount: document.querySelectorAll(
      ".gsap-react-marquee-container > .gsap-react-marquee"
    ).length,
    timeline: window.__marqueeFixture.baseTimelineState(),
  }));
  expect(finalState.itemCount).toBeGreaterThan(2);
  expect(finalState.timeline).toMatchObject({
    paused: false,
    repeatValue: 2,
    reversed: true,
  });
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

  const durations = await page.evaluate(async () => {
    for (let frame = 0; frame < 60; frame += 1) {
      const nextDurations = window.__marqueeFixture.timelineDurations();
      if (nextDurations.length > 0) return nextDurations;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }
    return [];
  });
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
      dir: "up",
      fill: true,
    });
  });
  await expect.poll(() => marqueeItems(page).count()).toBe(7);

  await page.evaluate(() => {
    window.__marqueeFixture.render({
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

const directions = ["left", "right", "up", "down"] as const;

for (const dir of directions) {
  for (const loop of [0, 1, 2]) {
    test(`${dir} finite loop=${loop} executes exactly ${loop + 1} cycles`, async ({
      page,
    }) => {
      await page.evaluate(
        ({ direction, repeat }) => {
          window.__marqueeFixture.render({
            delay: 0.15,
            dir: direction,
            loop: repeat,
            speed: 2_000,
          });
        },
        { direction: dir, repeat: loop }
      );

      await expect
        .poll(() =>
          page.evaluate(() => window.__marqueeFixture.observeBaseTimeline())
        )
        .toBe(true);

      const isReverse = dir === "right" || dir === "down";
      if (isReverse) {
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                window.__marqueeFixture.baseTimelineState()?.reverseComplete
            )
          )
          .toBe(1);
      } else {
        await expect
          .poll(() =>
            page.evaluate(
              () => window.__marqueeFixture.baseTimelineState()?.complete
            )
          )
          .toBe(1);
      }

      const state = await page.evaluate(() =>
        window.__marqueeFixture.baseTimelineState()
      );
      expect(state).not.toBeNull();
      expect(state?.repeat).toBe(loop);
      expect(state?.repeatValue).toBe(loop);
      expect(state?.active).toBe(false);
      expect(state?.totalProgress).toBeCloseTo(isReverse ? 0 : 1, 5);
    });
  }

  test(`${dir} infinite loop stays active across multiple cycles`, async ({
    page,
  }) => {
    await page.evaluate((direction) => {
      window.__marqueeFixture.render({
        delay: 0.1,
        dir: direction,
        loop: -1,
        speed: 2_000,
      });
    }, dir);

    await expect
      .poll(() =>
        page.evaluate(() => window.__marqueeFixture.observeBaseTimeline())
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__marqueeFixture.baseTimelineState()?.repeat ?? 0
        )
      )
      .toBeGreaterThanOrEqual(2);

    const state = await page.evaluate(() =>
      window.__marqueeFixture.baseTimelineState()
    );
    expect(state?.repeatValue).toBe(-1);
    expect(state?.paused).toBe(false);
    expect(state?.reversed).toBe(dir === "right" || dir === "down");
  });
}

test("controlled pause survives pointer and focus enter/leave", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({ paused: true, pauseOnHover: true });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(true);

  const root = page.locator(".gsap-react-marquee-container");
  await root.dispatchEvent("pointerenter");
  await root.dispatchEvent("pointerleave");
  expect(
    await page.evaluate(
      () => window.__marqueeFixture.baseTimelineState()?.paused
    )
  ).toBe(true);

  await page.locator(".fixture-focus-target").first().focus();
  await page.locator("body").focus();
  expect(
    await page.evaluate(
      () => window.__marqueeFixture.baseTimelineState()?.paused
    )
  ).toBe(true);
});

test("controlled pause changes resume in configured direction", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({ dir: "right", paused: true });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(true);

  await page.evaluate(() => {
    window.__marqueeFixture.render({ dir: "right", paused: false });
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.__marqueeFixture.baseTimelineState();
        return Boolean(state && !state.paused && state.reversed);
      })
    )
    .toBe(true);
});

test("scroll follow cannot resume controlled pause", async ({ page }) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      paused: true,
      scrollFollow: true,
      scrollSpeed: 3,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.resourceCounts().observers)
    )
    .toBe(1);

  await page.mouse.move(100, 80);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(100);

  const state = await page.evaluate(() =>
    window.__marqueeFixture.baseTimelineState()
  );
  expect(state?.paused).toBe(true);
  expect(state?.timeScale).toBe(1);
  expect(
    await page.evaluate(
      () => window.__marqueeFixture.resourceCounts().taggedAnimations
    )
  ).toBe(1);
});

test("scroll follow restores legacy boost then base direction", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      dir: "down",
      scrollFollow: true,
      scrollSpeed: 3,
      speed: 500,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.resourceCounts().observers)
    )
    .toBe(1);

  await page.mouse.move(100, 80);
  await page.mouse.wheel(0, -200);
  const peakTimeScale = await page.evaluate(async () => {
    let peak = 0;
    for (let frame = 0; frame < 20; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      peak = Math.max(
        peak,
        Math.abs(
          window.__marqueeFixture.baseTimelineState()?.timeScale ?? 0
        )
      );
    }
    return peak;
  });
  expect(peakTimeScale).toBeGreaterThan(8);
  expect(peakTimeScale).toBeLessThanOrEqual(9.1);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const state = window.__marqueeFixture.baseTimelineState();
          return state
            ? { reversed: state.reversed, timeScale: state.timeScale }
            : null;
        }),
      { timeout: 3_000 }
    )
    .toEqual({ reversed: true, timeScale: -1 });
});

test("scroll reversal keeps a forward infinite timeline continuous", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      dir: "left",
      loop: -1,
      scrollFollow: true,
      scrollSpeed: 3,
      speed: 500,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.observeBaseTimeline())
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__marqueeFixture.baseTimelineState()
            ?.hasReverseContinuation
      )
    )
    .toBe(true);

  await page.mouse.move(100, 80);
  await page.mouse.wheel(0, -200);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__marqueeFixture.baseTimelineState()?.reverseComplete ?? 0
      )
    )
    .toBeGreaterThan(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const state = window.__marqueeFixture.baseTimelineState();
          return state
            ? {
                active: state.active,
                reversed: state.reversed,
                timeScale: state.timeScale,
              }
            : null;
        }),
      { timeout: 3_000 }
    )
    .toEqual({ active: true, reversed: false, timeScale: 1 });
});

test("changing paused during scroll kills response and stops playback", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      paused: false,
      scrollFollow: true,
      scrollSpeed: 3,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.resourceCounts().observers)
    )
    .toBe(1);

  await page.mouse.move(100, 80);
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__marqueeFixture.resourceCounts().taggedAnimations
      )
    )
    .toBeGreaterThan(1);

  await page.evaluate(() => {
    window.__marqueeFixture.render({
      paused: true,
      scrollFollow: true,
      scrollSpeed: 3,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.__marqueeFixture.baseTimelineState();
        return {
          paused: state?.paused,
          resources: window.__marqueeFixture.resourceCounts().taggedAnimations,
          timeScale: state?.timeScale,
        };
      })
    )
    .toEqual({ paused: true, resources: 1, timeScale: 1 });
});

for (const reverseDirection of ["right", "down"] as const) {
  test(`${reverseDirection} infinite reverse stays seamless for two cycles`, async ({
    page,
  }) => {
    const vertical = reverseDirection === "down";
    await page.evaluate(
      (direction) => {
        window.__marqueeFixture.setContainerSize(800, 320);
        window.__marqueeFixture.render({
          dir: direction,
          fill: true,
          speed: 2_000,
        });
      },
      reverseDirection
    );

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__marqueeFixture
            .timelineDurations()
            .some((duration) => Number.isFinite(duration) && duration > 0)
        )
      )
      .toBe(true);

    const result = await measureLoopGaps(page, vertical);
    expect(result.cycleDuration).toBeGreaterThan(0);
    expect(result.frames).toBeGreaterThanOrEqual(8);
    expect(result.maxGap).toBeLessThanOrEqual(18);
  });
}

test("paused reverse marquee remains paused after drag release", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      dir: "right",
      draggable: true,
      paused: true,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(true);

  const trigger = page.locator(".gsap-react-marquee").first();
  const bounds = await trigger.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  await page.mouse.move(bounds.x + 100, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 40, bounds.y + 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  expect(
    await page.evaluate(
      () => window.__marqueeFixture.baseTimelineState()?.paused
    )
  ).toBe(true);
});

test("unmount kills reverse delay, observer, and tagged timelines", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      delay: 1,
      dir: "right",
      scrollFollow: true,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.resourceCounts().baseTimelines)
    )
    .toBe(1);

  await page.evaluate(() => window.__marqueeFixture.unmount());
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 0, observers: 0, taggedAnimations: 0 });
});

test("StrictMode leaves one timeline and one scroll observer", async ({
  page,
}) => {
  await page.goto("/?strict=1");
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      pauseOnHover: true,
      scrollFollow: true,
    });
  });

  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 1, observers: 1, taggedAnimations: 1 });

  const root = page.locator(".gsap-react-marquee-container");
  await root.dispatchEvent("pointerenter");
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(true);
  await root.dispatchEvent("pointerleave");
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(false);
});

test("client clones are hidden, inert, and sanitized", async ({ page }) => {
  await page.goto("/?content=accessibility");
  await expect.poll(() => marqueeItems(page).count()).toBe(2);

  const result = await page.evaluate(() => {
    const clone = document.querySelector<HTMLElement>(
      "[data-gsap-react-marquee-clone]"
    );
    const form = document.querySelector<HTMLFormElement>("#fixture-form");
    if (!clone || !form) throw new Error("Accessibility fixture is missing");

    return {
      ariaHidden: clone.getAttribute("aria-hidden"),
      cloneIdCount: clone.querySelectorAll("[id]").length,
      cloneNameCount: clone.querySelectorAll("[name]").length,
      cloneReferenceCount: clone.querySelectorAll(
        "[for], [form], [aria-labelledby], [href^='#'], [clip-path*='url(#']"
      ).length,
      formValues: new FormData(form).getAll("email"),
      inert: clone.hasAttribute("inert"),
      originalIdCount: document.querySelectorAll("#fixture-input").length,
      unsafeCloneTabStops: Array.from(
        clone.querySelectorAll<HTMLElement>(
          "a, button, input, select, textarea, [tabindex]"
        )
      ).filter((element) => element.tabIndex >= 0).length,
    };
  });

  expect(result).toEqual({
    ariaHidden: "true",
    cloneIdCount: 0,
    cloneNameCount: 0,
    cloneReferenceCount: 0,
    formValues: ["original"],
    inert: true,
    originalIdCount: 1,
    unsafeCloneTabStops: 0,
  });
});

test("native inert leaves no visual-clone focus target", async ({ page }) => {
  await expect.poll(() => marqueeItems(page).count()).toBe(2);
  const nativeInert = await page.evaluate(
    () => "inert" in HTMLElement.prototype
  );
  expect(nativeInert).toBe(true);

  const cloneFocused = await page.evaluate(() => {
    const cloneButton = document.querySelector<HTMLButtonElement>(
      "[data-gsap-react-marquee-clone] button"
    );
    cloneButton?.focus();
    return Boolean(
      cloneButton &&
        document.activeElement === cloneButton &&
        cloneButton.closest("[data-gsap-react-marquee-clone]")
    );
  });
  expect(cloneFocused).toBe(false);

  await page.keyboard.press("Tab");
  await expect(page.locator("[data-gsap-react-marquee-original] button")).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(
        document.activeElement?.closest("[data-gsap-react-marquee-clone]")
      )
    )
  ).toBe(false);
});

test("forced no-native-inert fallback blocks pointer and programmatic focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "inert");
  });
  await page.goto("/");
  await expect.poll(() => marqueeItems(page).count()).toBe(2);
  expect(
    await page.evaluate(() => "inert" in HTMLElement.prototype)
  ).toBe(false);

  const fallbackState = await page.evaluate(() => {
    const clone = document.querySelector<HTMLElement>(
      "[data-gsap-react-marquee-clone]"
    );
    const cloneButton = clone?.querySelector<HTMLButtonElement>("button");
    cloneButton?.focus();

    return {
      cloneFocused: document.activeElement === cloneButton,
      fallbackMarked: clone?.hasAttribute(
        "data-gsap-react-marquee-inert-fallback"
      ),
      pointerEvents: clone ? getComputedStyle(clone).pointerEvents : null,
      tabIndex: cloneButton?.tabIndex,
    };
  });

  expect(fallbackState).toEqual({
    cloneFocused: false,
    fallbackMarked: true,
    pointerEvents: "none",
    tabIndex: -1,
  });
});

test("clone safety reruns after child changes and warns once", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "warning" &&
      message.text().includes("presentational children only")
    ) {
      warnings.push(message.text());
    }
  });
  await page.goto("/?content=presentational");
  await expect.poll(() => marqueeItems(page).count()).toBe(2);

  await page.evaluate(() =>
    window.__marqueeFixture.setContentVariant("accessibility")
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const clone = document.querySelector(
          "[data-gsap-react-marquee-clone]"
        );
        return clone?.querySelectorAll("[id], [name]").length;
      })
    )
    .toBe(0);

  await page.evaluate(() => {
    window.__marqueeFixture.setContentVariant("presentational");
    window.__marqueeFixture.setContentVariant("accessibility");
  });
  await expect.poll(() => warnings.length).toBe(1);
});

test("reduced motion stays static and reacts to preference changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("[data-gsap-react-marquee-original]")).toBeVisible();
  await expect.poll(() => marqueeItems(page).count()).toBe(1);
  expect(await page.evaluate(() => window.__marqueeFixture.resourceCounts())).toEqual({
    baseTimelines: 0,
    observers: 0,
    taggedAnimations: 0,
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 1, observers: 0, taggedAnimations: 1 });
  await expect.poll(() => marqueeItems(page).count()).toBe(2);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 0, observers: 0, taggedAnimations: 0 });
  await expect.poll(() => marqueeItems(page).count()).toBe(1);
});

test("respectReducedMotion=false restores controlled animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      draggable: true,
      paused: true,
      respectReducedMotion: false,
      scrollFollow: true,
    });
  });

  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.resourceCounts()))
    .toEqual({ baseTimelines: 1, observers: 1, taggedAnimations: 1 });
  expect(
    await page.evaluate(
      () => window.__marqueeFixture.baseTimelineState()?.paused
    )
  ).toBe(true);
});

test("container props keep root semantics and user handlers", async ({ page }) => {
  await page.evaluate(() => {
    window.__marqueeFixture.render({
      containerProps: {
        "aria-label": "Partner logos",
        "data-marquee": "partners",
        onClick() {
          document.body.dataset.marqueeClicked = "true";
        },
        onFocus() {
          document.body.dataset.marqueeFocused = "true";
        },
        onPointerEnter() {
          document.body.dataset.marqueeEntered = "true";
        },
        role: "region",
      },
      pauseOnHover: true,
    });
  });

  const root = page.locator(".gsap-react-marquee-container");
  await expect(root).toHaveAttribute("aria-label", "Partner logos");
  await expect(root).toHaveAttribute("data-marquee", "partners");
  await expect(root).toHaveAttribute("role", "region");
  await expect(page.locator('[aria-label="Partner logos"]')).toHaveCount(1);
  await root.click({ position: { x: 1, y: 1 } });
  await expect(page.locator("body")).toHaveAttribute(
    "data-marquee-clicked",
    "true"
  );

  await root.hover();
  await expect(page.locator("body")).toHaveAttribute(
    "data-marquee-entered",
    "true"
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.paused)
    )
    .toBe(true);

  await page.locator("[data-gsap-react-marquee-original] button").focus();
  await expect(page.locator("body")).toHaveAttribute(
    "data-marquee-focused",
    "true"
  );
});
