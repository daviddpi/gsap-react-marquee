import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { registerPlugin } = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
}));

vi.mock("@gsap/react", () => {
  const useGSAP = Object.assign(() => undefined, {
    register: vi.fn(),
  });

  return { useGSAP };
});

vi.mock("gsap", () => ({
  gsap: { registerPlugin },
}));

vi.mock("gsap/all.js", () => ({
  Draggable: {},
  InertiaPlugin: {},
  Observer: {},
}));

import GSAPReactMarquee from "../../src/components/gsap-react-marquee";

describe("GSAPReactMarquee rendering baseline", () => {
  it("renders static markup without browser globals", () => {
    const markup = renderToStaticMarkup(
      <GSAPReactMarquee>
        <span>SSR content</span>
      </GSAPReactMarquee>
    );

    expect(markup).toContain("gsap-react-marquee-container");
    expect(markup).toContain("SSR content");
  });

  it("updates direction and child class props", () => {
    const { container, rerender } = render(
      <GSAPReactMarquee className="initial-content" dir="left">
        <span>Changing content</span>
      </GSAPReactMarquee>
    );

    const marqueeRoot = container.firstElementChild;
    expect(marqueeRoot).not.toHaveClass("gsap-react-marquee-vertical");
    expect(screen.getAllByText("Changing content")).toHaveLength(2);
    expect(container.querySelectorAll(".initial-content")).toHaveLength(2);

    rerender(
      <GSAPReactMarquee className="updated-content" dir="up">
        <span>Changing content</span>
      </GSAPReactMarquee>
    );

    expect(marqueeRoot).toHaveClass("gsap-react-marquee-vertical");
    expect(container.querySelectorAll(".initial-content")).toHaveLength(0);
    expect(container.querySelectorAll(".updated-content")).toHaveLength(2);
  });
});
