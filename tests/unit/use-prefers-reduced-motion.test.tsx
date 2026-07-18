import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REDUCED_MOTION_QUERY,
  usePrefersReducedMotion,
} from "../../src/components/hooks/use-prefers-reduced-motion";

const ReducedMotionProbe = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  return <output>{String(prefersReducedMotion)}</output>;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePrefersReducedMotion", () => {
  it("subscribes to preference changes and cleans up", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    const addEventListener = vi.fn(
      (_event: string, listener: () => void) => listeners.add(listener)
    );
    const removeEventListener = vi.fn(
      (_event: string, listener: () => void) => listeners.delete(listener)
    );
    const mediaQuery = {
      addEventListener,
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      get matches() {
        return matches;
      },
      media: REDUCED_MOTION_QUERY,
      onchange: null,
      removeEventListener,
      removeListener: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

    const { unmount } = render(<ReducedMotionProbe />);
    expect(screen.getByText("false")).toBeInTheDocument();

    matches = true;
    act(() => listeners.forEach((listener) => listener()));
    expect(screen.getByText("true")).toBeInTheDocument();

    unmount();
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("supports the legacy MediaQueryList listener API", () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        () =>
          ({
            addListener,
            matches: true,
            media: REDUCED_MOTION_QUERY,
            removeListener,
          }) as unknown as MediaQueryList
      )
    );

    const { unmount } = render(<ReducedMotionProbe />);
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(addListener).toHaveBeenCalledWith(expect.any(Function));

    unmount();
    expect(removeListener).toHaveBeenCalledWith(expect.any(Function));
  });
});
