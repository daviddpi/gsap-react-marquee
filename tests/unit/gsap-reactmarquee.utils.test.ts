import { describe, expect, it, vi } from "vitest";
import {
  calculateDuplicateCount,
  calculateDuplicateCountResult,
  calculateDuplicates,
  getMinSize,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  resumeTimeline,
} from "../../src/components/gsap-reactmarquee.utils";

type ControlledTimeline = Parameters<typeof resumeTimeline>[0]["timeline"];

const createTimelineControlMock = () => {
  const timeline = {
    pause: vi.fn(),
    play: vi.fn(),
    reverse: vi.fn(),
    timeScale: vi.fn(),
  };

  timeline.pause.mockReturnValue(timeline);
  timeline.play.mockReturnValue(timeline);
  timeline.reverse.mockReturnValue(timeline);
  timeline.timeScale.mockReturnValue(timeline);

  return timeline;
};

describe("marquee utility baseline", () => {
  it("returns one visual duplicate when fill is disabled", () => {
    expect(
      calculateDuplicateCount(100, 1_000, {
        children: null,
        fill: false,
      })
    ).toBe(1);
  });

  it("keeps the legacy duplicate-count alias", () => {
    expect(calculateDuplicates).toBe(calculateDuplicateCount);
  });

  it("keeps normal and fill minimum-size behavior", () => {
    const baseProps = { children: null };

    expect(getMinSize(100, 500, baseProps)).toBe("100%");
    expect(getMinSize(600, 500, baseProps)).toBe("600px");
    expect(getMinSize(100, 500, { ...baseProps, fill: true })).toBe("auto");
  });
});

describe("normalizeMarqueeOptions", () => {
  const defaults = {
    delay: 0,
    loop: -1,
    maxDuplicates: 100,
    scrollSpeed: 2.5,
    spacing: 16,
    speed: 100,
  };

  it("preserves valid values and defaults", () => {
    expect(normalizeMarqueeOptions({})).toEqual(defaults);
    expect(
      normalizeMarqueeOptions({
        delay: 1,
        loop: 2,
        maxDuplicates: 25,
        scrollSpeed: 3,
        spacing: 0,
        speed: 80,
      })
    ).toEqual({
      delay: 1,
      loop: 2,
      maxDuplicates: 25,
      scrollSpeed: 3,
      spacing: 0,
      speed: 80,
    });
  });

  it.each([-1, 0, Number.NaN, Number.POSITIVE_INFINITY])(
    "normalizes invalid speed %s to 100",
    (speed) => {
      expect(normalizeMarqueeOptions({ speed }).speed).toBe(100);
    }
  );

  it.each([-1, Number.NaN, Number.NEGATIVE_INFINITY])(
    "normalizes invalid spacing %s to 16",
    (spacing) => {
      expect(normalizeMarqueeOptions({ spacing }).spacing).toBe(16);
    }
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "normalizes invalid delay %s to 0",
    (delay) => {
      expect(normalizeMarqueeOptions({ delay }).delay).toBe(0);
    }
  );

  it("falls back and clamps scroll speed", () => {
    expect(normalizeMarqueeOptions({ scrollSpeed: Number.NaN }).scrollSpeed).toBe(
      2.5
    );
    expect(
      normalizeMarqueeOptions({ scrollSpeed: Number.POSITIVE_INFINITY })
        .scrollSpeed
    ).toBe(2.5);
    expect(normalizeMarqueeOptions({ scrollSpeed: 0 }).scrollSpeed).toBe(1.1);
    expect(normalizeMarqueeOptions({ scrollSpeed: 10 }).scrollSpeed).toBe(4);
  });

  it.each([-2, -1.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "normalizes invalid loop %s to -1",
    (loop) => {
      expect(normalizeMarqueeOptions({ loop }).loop).toBe(-1);
    }
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "normalizes invalid maxDuplicates %s to 100",
    (maxDuplicates) => {
      expect(normalizeMarqueeOptions({ maxDuplicates }).maxDuplicates).toBe(100);
    }
  );

  it("enforces the internal duplicate safety ceiling", () => {
    expect(normalizeMarqueeOptions({ maxDuplicates: 10_000 }).maxDuplicates).toBe(
      250
    );
  });
});

describe("calculateDuplicateCount", () => {
  const fillProps = { children: null, fill: true };

  it("keeps one duplicate for normal mode on every target size", () => {
    expect(calculateDuplicateCount(10, 10_000, { ...fillProps, fill: false })).toBe(
      1
    );
  });

  it("includes spacing while covering the viewport and one wrap segment", () => {
    expect(calculateDuplicateCount(100, 410, { ...fillProps, spacing: 0 })).toBe(
      5
    );
    expect(calculateDuplicateCount(100, 410, { ...fillProps, spacing: 20 })).toBe(
      4
    );
    expect(calculateDuplicateCount(100, 410, { ...fillProps, spacing: 200 })).toBe(
      3
    );
  });

  it("uses a realistic default before reaching the hard ceiling", () => {
    expect(calculateDuplicateCount(10, 1_000, { ...fillProps, spacing: 0 })).toBe(
      100
    );
  });

  it("reports configured and internal coverage limits with finite output", () => {
    expect(
      calculateDuplicateCountResult(1, 1_000, {
        ...fillProps,
        maxDuplicates: 3,
        spacing: 0,
      })
    ).toEqual({
      duplicateCount: 3,
      limitReached: true,
      requiredDuplicateCount: 1_000,
    });

    expect(
      calculateDuplicateCountResult(1, 1_000, {
        ...fillProps,
        maxDuplicates: 10_000,
        spacing: 0,
      })
    ).toEqual({
      duplicateCount: 250,
      limitReached: true,
      requiredDuplicateCount: 1_000,
    });
  });
});

describe("hasUsableMeasurement", () => {
  it("accepts only non-empty finite positive measurements", () => {
    expect(hasUsableMeasurement(1, 100.5)).toBe(true);
    expect(hasUsableMeasurement()).toBe(false);
    expect(hasUsableMeasurement(0)).toBe(false);
    expect(hasUsableMeasurement(-1)).toBe(false);
    expect(hasUsableMeasurement(Number.NaN)).toBe(false);
    expect(hasUsableMeasurement(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("keeps duplicate calculation finite for unusable measurements", () => {
    const fillProps = { children: null, fill: true };

    expect(calculateDuplicateCount(Number.NaN, 100, fillProps)).toBe(1);
    expect(calculateDuplicateCount(100, Number.POSITIVE_INFINITY, fillProps)).toBe(
      1
    );
  });
});

describe("resumeTimeline", () => {
  it("always keeps controlled paused timelines paused", () => {
    const timeline = createTimelineControlMock();

    resumeTimeline({
      timeline: timeline as unknown as ControlledTimeline,
      isReverse: true,
      paused: true,
    });

    expect(timeline.timeScale).toHaveBeenCalledWith(1);
    expect(timeline.pause).toHaveBeenCalledOnce();
    expect(timeline.play).not.toHaveBeenCalled();
    expect(timeline.reverse).not.toHaveBeenCalled();
  });

  it("restores forward playback at the base time scale", () => {
    const timeline = createTimelineControlMock();

    resumeTimeline({
      timeline: timeline as unknown as ControlledTimeline,
      isReverse: false,
      paused: false,
    });

    expect(timeline.timeScale).toHaveBeenCalledWith(1);
    expect(timeline.play).toHaveBeenCalledOnce();
    expect(timeline.reverse).not.toHaveBeenCalled();
  });

  it("restores reverse playback at the base time scale", () => {
    const timeline = createTimelineControlMock();

    resumeTimeline({
      timeline: timeline as unknown as ControlledTimeline,
      isReverse: true,
      paused: false,
    });

    expect(timeline.timeScale).toHaveBeenCalledWith(1);
    expect(timeline.reverse).toHaveBeenCalledOnce();
    expect(timeline.play).not.toHaveBeenCalled();
  });
});
