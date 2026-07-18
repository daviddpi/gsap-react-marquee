import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
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

vi.mock("gsap/Draggable.js", () => ({ Draggable: {} }));
vi.mock("gsap/Observer.js", () => ({ Observer: {} }));

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
    expect(screen.getAllByText("Changing content")).toHaveLength(1);
    expect(container.querySelectorAll(".initial-content")).toHaveLength(1);

    rerender(
      <GSAPReactMarquee className="updated-content" dir="up">
        <span>Changing content</span>
      </GSAPReactMarquee>
    );

    expect(marqueeRoot).toHaveClass("gsap-react-marquee-vertical");
    expect(container.querySelectorAll(".initial-content")).toHaveLength(0);
    expect(container.querySelectorAll(".updated-content")).toHaveLength(1);
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
    expect(container.querySelectorAll(".content-only")).toHaveLength(1);
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

  it("renders one semantic original during SSR", () => {
    const markup = renderToStaticMarkup(
      <GSAPReactMarquee>
        <button id="ssr-action" type="button">
          SSR action
        </button>
      </GSAPReactMarquee>
    );

    expect(markup.match(/id="ssr-action"/g)).toHaveLength(1);
    expect(markup.match(/<button/g)).toHaveLength(1);
    expect(markup).not.toContain("data-gsap-react-marquee-clone");
  });

  it("hydrates SSR markup without mismatch warnings", async () => {
    const element = (
      <GSAPReactMarquee>
        <span>Hydrated content</span>
      </GSAPReactMarquee>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(element);
    document.body.append(host);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot> | undefined;

    await act(async () => {
      root = hydrateRoot(host, element);
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
    consoleError.mockRestore();
    host.remove();
  });

  it("preserves root attributes and user event handlers", () => {
    const onClick = vi.fn();
    const { container } = render(
      <GSAPReactMarquee
        containerProps={{
          "aria-label": "Partner logos",
          "data-marquee": "partners",
          onClick,
          role: "region",
        }}
      >
        <span>Root props</span>
      </GSAPReactMarquee>
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-label", "Partner logos");
    expect(root).toHaveAttribute("data-marquee", "partners");
    expect(root).toHaveAttribute("role", "region");
    fireEvent.click(root);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("warns once for unsupported child content", () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { rerender } = render(
      <GSAPReactMarquee>
        <button type="button">Unsupported</button>
      </GSAPReactMarquee>
    );

    rerender(
      <GSAPReactMarquee>
        <a href="/next">Still unsupported</a>
      </GSAPReactMarquee>
    );

    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0]?.[0]).toContain("presentational children only");
    warning.mockRestore();
  });

  it("keeps diagnostics safe when the browser has no process global", () => {
    vi.stubGlobal("process", undefined);
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    expect(() =>
      render(
        <GSAPReactMarquee>
          <button type="button">Bare browser warning</button>
        </GSAPReactMarquee>
      )
    ).not.toThrow();
    expect(warning).toHaveBeenCalledOnce();

    warning.mockRestore();
    vi.unstubAllGlobals();
  });
});
