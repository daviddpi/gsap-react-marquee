import { describe, expect, it } from "vitest";
import {
  hasUnsupportedMarqueeContent,
  installMarqueeCloneFocusGuard,
  sanitizeMarqueeClones,
} from "../../src/components/marquee-accessibility";

describe("marquee clone accessibility", () => {
  it("sanitizes clone semantics without changing the original", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div data-gsap-react-marquee-original>
        <label id="original-label" for="original-input">Email</label>
        <input id="original-input" name="email" aria-labelledby="original-label" />
      </div>
      <div data-gsap-react-marquee-clone>
        <label id="clone-label" for="clone-input">Email</label>
        <input id="clone-input" name="email" aria-labelledby="clone-label" />
        <a id="clone-link" href="#clone-input">Jump</a>
        <svg><rect id="clone-shape" clip-path="url(#clone-clip)" /></svg>
      </div>
    `;

    sanitizeMarqueeClones(container, false);

    const clone = container.querySelector<HTMLElement>(
      "[data-gsap-react-marquee-clone]"
    );
    expect(clone).toHaveAttribute("aria-hidden", "true");
    expect(clone).toHaveAttribute("inert");
    expect(clone).toHaveAttribute("data-gsap-react-marquee-inert-fallback");
    expect(clone?.querySelectorAll("[id]")).toHaveLength(0);
    expect(clone?.querySelectorAll("[name]")).toHaveLength(0);
    expect(clone?.querySelector("label")).not.toHaveAttribute("for");
    expect(clone?.querySelector("input")).not.toHaveAttribute(
      "aria-labelledby"
    );
    expect(clone?.querySelector("input")).toHaveAttribute("tabindex", "-1");
    expect(clone?.querySelector("a")).not.toHaveAttribute("href");
    expect(clone?.querySelector("rect")).not.toHaveAttribute("clip-path");
    expect(
      container.querySelector("[data-gsap-react-marquee-original] input")
    ).toHaveAttribute("name", "email");
    expect(
      container.querySelector("[data-gsap-react-marquee-original] label")
    ).toHaveAttribute("for", "original-input");
  });

  it("detects only unsupported original content", () => {
    const original = document.createElement("div");
    original.innerHTML = '<span tabindex="-1">Presentational</span>';
    expect(hasUnsupportedMarqueeContent(original)).toBe(false);

    original.innerHTML = '<span tabindex="0">Focusable</span>';
    expect(hasUnsupportedMarqueeContent(original)).toBe(true);

    original.innerHTML = '<span id="stable-id">Identified</span>';
    expect(hasUnsupportedMarqueeContent(original)).toBe(true);
  });

  it("removes programmatic focus from fallback clones", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button type="button">Original</button>
      <div data-gsap-react-marquee-clone><button type="button">Clone</button></div>
    `;
    document.body.append(container);
    sanitizeMarqueeClones(container, false);
    const cleanup = installMarqueeCloneFocusGuard(container, false);
    const cloneButton = container.querySelector<HTMLButtonElement>(
      "[data-gsap-react-marquee-clone] button"
    );

    cloneButton?.focus();
    expect(document.activeElement).not.toBe(cloneButton);

    cleanup();
    container.remove();
  });
});
