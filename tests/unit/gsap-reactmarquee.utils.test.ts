import { describe, expect, it } from "vitest";
import {
  calculateDuplicateCount,
  calculateDuplicates,
  getMinSize,
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
