import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { registerPlugin, set } = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@gsap/react", () => {
  const useGSAP = Object.assign(() => undefined, {
    register: vi.fn(),
  });

  return { useGSAP };
});

vi.mock("gsap", () => ({
  gsap: { registerPlugin, set },
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

  it("keeps root classes and styles separate from repeated content", () => {
    const { container } = render(
      <GSAPReactMarquee
        className="content-only"
        containerClassName="viewport-only"
        containerStyle={{
          display: "grid",
          height: 320,
          overflow: "visible",
          whiteSpace: "normal",
        }}
        gradientColor="#123456"
      >
        <span>Styled content</span>
      </GSAPReactMarquee>
    );

    const marqueeRoot = container.firstElementChild as HTMLElement;
    expect(marqueeRoot).toHaveClass(
      "gsap-react-marquee-container",
      "viewport-only"
    );
    expect(marqueeRoot).not.toHaveClass("content-only");
    expect(container.querySelectorAll(".viewport-only")).toHaveLength(1);
    expect(container.querySelectorAll(".content-only")).toHaveLength(2);
    expect(marqueeRoot).toHaveStyle({
      display: "flex",
      height: "320px",
      overflow: "hidden",
      position: "relative",
      whiteSpace: "nowrap",
    });
    expect(marqueeRoot.style.getPropertyValue("--gradient-color")).toBe(
      "#123456"
    );
  });
});
