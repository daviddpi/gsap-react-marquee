import { describe, expect, it } from "vitest";
import {
  calculateDuplicateCount,
  calculateDuplicates,
  getMinSize,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
} from "../../src/components/gsap-reactmarquee.utils";

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
        scrollSpeed: 3,
        spacing: 0,
        speed: 80,
      })
    ).toEqual({
      delay: 1,
      loop: 2,
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
