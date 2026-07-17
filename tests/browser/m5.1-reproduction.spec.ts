import { expect, test, type Page } from "@playwright/test";

type VerticalDirection = "down" | "up";
type VerticalFixtureContent = "vertical-example" | "vertical-title";

type VerticalFixtureOptions = {
  content: VerticalFixtureContent;
  direction: VerticalDirection;
  fill: boolean;
  height: number;
  paused?: boolean;
  spacing: number;
  speed: number;
  width: number;
};

type WrapTrace = {
  entryEnd: number;
  entryStart: number;
  frameDistanceTolerance: number;
  itemHeight: number;
  jump: number;
  transform: string;
};

type VerticalTraceResult = {
  contentHeight: number;
  frames: number;
  itemCount: number;
  maxGap: number;
  rootHeight: number;
  rootWidth: number;
  traces: WrapTrace[];
  viewportHeight: number;
  viewportWidth: number;
};

const waitForFrames = (page: Page, count = 2) =>
  page.evaluate(async (frameCount) => {
    for (let frame = 0; frame < frameCount; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);

const mountVerticalFixture = async (
  page: Page,
  options: VerticalFixtureOptions
) => {
  await page.goto("/");
  await page.evaluate((fixtureOptions) => {
    const fixture = document.querySelector<HTMLElement>("#fixture");
    const reactRoot = document.querySelector<HTMLElement>("#root");
    if (!fixture || !reactRoot) {
      throw new Error("Fixture viewport is missing");
    }

    Object.assign(fixture.style, {
      alignItems: "center",
      display: "flex",
      height: `${fixtureOptions.height}px`,
      justifyContent: "center",
      width: `${fixtureOptions.width}px`,
    });
    // Match consumer JSX: Marquee participates directly in the flex parent.
    reactRoot.style.display = "contents";
    window.__marqueeFixture.setContentVariant(fixtureOptions.content);
    window.__marqueeFixture.render({
      dir: fixtureOptions.direction,
      fill: fixtureOptions.fill,
      gradient: true,
      paused: fixtureOptions.paused ?? false,
      respectReducedMotion: false,
      spacing: fixtureOptions.spacing,
      speed: fixtureOptions.speed,
    });
  }, options);

  await waitForFrames(page);
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.baseTimelineState()))
    .not.toBeNull();
};

const updateVerticalFixture = async (
  page: Page,
  options: VerticalFixtureOptions
) => {
  await page.evaluate((nextOptions) => {
    window.__marqueeFixture.render({
      dir: nextOptions.direction,
      fill: nextOptions.fill,
      gradient: true,
      paused: nextOptions.paused ?? false,
      respectReducedMotion: false,
      spacing: nextOptions.spacing,
      speed: nextOptions.speed,
    });
  }, options);
  await waitForFrames(page);
};

const traceVerticalWraps = async (
  page: Page,
  direction: VerticalDirection,
  duration: number,
  speed: number
): Promise<VerticalTraceResult> => {
  return page.evaluate(async ({ nextDirection, pixelsPerSecond, traceDuration }) => {
    const viewport = document.querySelector<HTMLElement>("#fixture");
    const root = document.querySelector<HTMLElement>(
      ".gsap-react-marquee-container"
    );
    const originalContent = root?.querySelector<HTMLElement>(
      "[data-gsap-react-marquee-original] .gsap-react-marquee-content"
    );
    if (!viewport || !root || !originalContent) {
      throw new Error("Marquee geometry is missing");
    }

    const items = Array.from(
      root.querySelectorAll<HTMLElement>(".gsap-react-marquee-content")
    );
    const previousTops = items.map(
      (item) => item.getBoundingClientRect().top
    );
    const traces: WrapTrace[] = [];
    const endTime = performance.now() + traceDuration;
    let frames = 0;
    let maxGap = 0;
    let previousFrameTime = performance.now();

    do {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const frameTime = performance.now();
      const timeDistanceTolerance =
        Math.ceil(
          pixelsPerSecond * ((frameTime - previousFrameTime) / 1_000)
        ) + 4;
      const rootRect = root.getBoundingClientRect();
      const intervals: Array<{ end: number; start: number }> = [];

      const samples = items.map((item, index) => {
        const rect = item.getBoundingClientRect();
        const jump = rect.top - previousTops[index];
        const didWrap =
          nextDirection === "up"
            ? jump > rect.height
            : jump < -rect.height;
        return { didWrap, item, jump, rect };
      });
      const observedFrameTravel = Math.max(
        0,
        ...samples
          .filter(({ didWrap, jump }) =>
            nextDirection === "up"
              ? !didWrap && jump < 0
              : !didWrap && jump > 0
          )
          .map(({ jump }) => Math.abs(jump))
      );
      const frameDistanceTolerance = Math.max(
        timeDistanceTolerance,
        Math.ceil(observedFrameTravel) + 4
      );

      samples.forEach(({ didWrap, item, jump, rect }, index) => {
        if (didWrap) {
          const ownTransform = getComputedStyle(item).transform;
          const wrapperTransform = item.parentElement
            ? getComputedStyle(item.parentElement).transform
            : "none";
          traces.push({
            entryEnd: rect.bottom - rootRect.top,
            entryStart: rect.top - rootRect.top,
            frameDistanceTolerance,
            itemHeight: rect.height,
            jump,
            transform:
              ownTransform === "none" ? wrapperTransform : ownTransform,
          });
        }

        if (rect.bottom > rootRect.top && rect.top < rootRect.bottom) {
          intervals.push({
            end: Math.min(rect.bottom, rootRect.bottom),
            start: Math.max(rect.top, rootRect.top),
          });
        }

        previousTops[index] = rect.top;
      });

      intervals.sort((first, second) => first.start - second.start);
      let coveredUntil = rootRect.top;
      for (const interval of intervals) {
        maxGap = Math.max(maxGap, interval.start - coveredUntil);
        coveredUntil = Math.max(coveredUntil, interval.end);
      }
      maxGap = Math.max(maxGap, rootRect.bottom - coveredUntil);
      frames += 1;
      previousFrameTime = frameTime;
    } while (performance.now() < endTime);

    const rootRect = root.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    return {
      contentHeight: originalContent.offsetHeight,
      frames,
      itemCount: items.length,
      maxGap,
      rootHeight: rootRect.height,
      rootWidth: rootRect.width,
      traces,
      viewportHeight: viewportRect.height,
      viewportWidth: viewportRect.width,
    };
  }, {
    nextDirection: direction,
    pixelsPerSecond: speed,
    traceDuration: duration,
  });
};

const expectCorrectEntries = (
  result: VerticalTraceResult,
  direction: VerticalDirection,
  minimumWraps: number
) => {
  expect(result.traces.length).toBeGreaterThanOrEqual(minimumWraps);

  const invalidEntries = result.traces.filter(
    ({ entryEnd, entryStart, frameDistanceTolerance }) =>
      direction === "up"
        ? entryStart < result.viewportHeight - frameDistanceTolerance
        : entryEnd > frameDistanceTolerance
  );
  expect(invalidEntries).toEqual([]);
  expect(
    result.traces.every(
      ({ transform }) => transform !== "none" && !transform.includes("NaN")
    )
  ).toBe(true);
};

for (const scenario of [
  {
    direction: "up",
    minimumWraps: 1,
    speed: 80,
    traceDuration: 6_000,
  },
  {
    direction: "down",
    minimumWraps: 1,
    speed: 80,
    traceDuration: 6_000,
  },
] as const) {
  test(`M5.1: ${scenario.direction} auto-sizes the icon example and enters from the correct edge`, async ({
    page,
  }) => {
    await mountVerticalFixture(page, {
      content: "vertical-example",
      direction: scenario.direction,
      fill: false,
      height: 300,
      spacing: 24,
      speed: scenario.speed,
      width: 200,
    });
    const result = await traceVerticalWraps(
      page,
      scenario.direction,
      scenario.traceDuration,
      scenario.speed
    );

    expect(result.contentHeight).toBe(400);
    expect(result.rootHeight).toBe(result.viewportHeight);
    expect(result.rootWidth).toBe(result.viewportWidth);
    expect(result.itemCount).toBe(2);
    expectCorrectEntries(result, scenario.direction, scenario.minimumWraps);
  });
}

test("M5.1: short vertical title enters from the viewport bottom without fill", async ({
  page,
}) => {
  await mountVerticalFixture(page, {
    content: "vertical-title",
    direction: "up",
    fill: false,
    height: 420,
    spacing: 16,
    speed: 80,
    width: 640,
  });
  const result = await traceVerticalWraps(page, "up", 6_000, 80);

  expect(result.contentHeight).toBe(112);
  expect(result.rootHeight).toBe(420);
  expect(result.itemCount).toBe(2);
  expectCorrectEntries(result, "up", 1);
});

for (const direction of ["up", "down"] as const) {
  for (const fill of [false, true]) {
    test(`M5.1: short title ${direction} fill=${fill} keeps every spacing wrap at the edge`, async ({
      page,
    }) => {
      for (const spacing of [0, 16, 80]) {
        await mountVerticalFixture(page, {
          content: "vertical-title",
          direction,
          fill,
          height: 420,
          spacing,
          speed: 3_000,
          width: 640,
        });
        const result = await traceVerticalWraps(
          page,
          direction,
          700,
          3_000
        );

        expect(result.contentHeight).toBe(112);
        expect(result.rootHeight).toBe(420);
        expectCorrectEntries(result, direction, 2);
        if (fill) expect(result.maxGap).toBeLessThanOrEqual(spacing + 2);
      }
    });
  }
}

test("M5.1: resize, clone change, pause, resume, direction change, and rebuild preserve entry edges", async ({
  page,
}) => {
  const options: VerticalFixtureOptions = {
    content: "vertical-title",
    direction: "up",
    fill: true,
    height: 420,
    spacing: 16,
    speed: 3_000,
    width: 640,
  };
  await mountVerticalFixture(page, options);

  const initialState = await page.evaluate(() =>
    window.__marqueeFixture.baseTimelineState()
  );
  expect(initialState).not.toBeNull();
  await expect
    .poll(() =>
      page.locator(".gsap-react-marquee-content").count()
    )
    .toBe(5);
  expectCorrectEntries(
    await traceVerticalWraps(page, "up", 700, options.speed),
    "up",
    2
  );

  await page.evaluate(() => window.__marqueeFixture.setContainerSize(640, 560));
  await expect
    .poll(() =>
      page.locator(".gsap-react-marquee-container").evaluate(
        (element) => element.getBoundingClientRect().height
      )
    )
    .toBe(560);
  await expect
    .poll(() => page.locator(".gsap-react-marquee-content").count())
    .toBe(6);
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.identity)
    )
    .not.toBe(initialState?.identity);
  expectCorrectEntries(
    await traceVerticalWraps(page, "up", 700, options.speed),
    "up",
    2
  );

  const resizedIdentity = await page.evaluate(
    () => window.__marqueeFixture.baseTimelineState()?.identity
  );
  options.height = 560;
  options.paused = true;
  await updateVerticalFixture(page, options);
  await expect
    .poll(() => page.evaluate(() => window.__marqueeFixture.baseTimelineState()))
    .toMatchObject({ paused: true });

  const pausedIdentity = await page.evaluate(
    () => window.__marqueeFixture.baseTimelineState()?.identity
  );
  expect(pausedIdentity).not.toBe(resizedIdentity);
  options.paused = false;
  await updateVerticalFixture(page, options);
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState())
    )
    .toMatchObject({ paused: false });
  expectCorrectEntries(
    await traceVerticalWraps(page, "up", 700, options.speed),
    "up",
    2
  );

  const resumedIdentity = await page.evaluate(
    () => window.__marqueeFixture.baseTimelineState()?.identity
  );
  options.direction = "down";
  await updateVerticalFixture(page, options);
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState())
    )
    .toMatchObject({ reversed: true });
  await expect
    .poll(() =>
      page.evaluate(() => window.__marqueeFixture.baseTimelineState()?.identity)
    )
    .not.toBe(resumedIdentity);
  expectCorrectEntries(
    await traceVerticalWraps(page, "down", 700, options.speed),
    "down",
    2
  );
});

for (const direction of ["up", "down"] as const) {
  test(`M5.1 stress: ${direction} survives at least 100 wraps without middle entry or excess gap`, async ({
    page,
  }) => {
    await mountVerticalFixture(page, {
      content: "vertical-title",
      direction,
      fill: true,
      height: 420,
      spacing: 16,
      speed: 3_000,
      width: 640,
    });
    const result = await traceVerticalWraps(page, direction, 6_000, 3_000);

    expect(result.frames).toBeGreaterThanOrEqual(120);
    expectCorrectEntries(result, direction, 100);
    expect(result.maxGap).toBeLessThanOrEqual(18);
  });
}
