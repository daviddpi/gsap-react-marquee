import { act, render } from "@testing-library/react";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSameMeasuredSize,
  useMarqueeMeasurement,
} from "../../src/components/use-marquee-measurement";

type MeasurementControls = ReturnType<typeof useMarqueeMeasurement>;

class InstrumentedResizeObserver {
  static instances: InstrumentedResizeObserver[] = [];

  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    InstrumentedResizeObserver.instances.push(this);
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  emit(...targets: Element[]) {
    this.callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver
    );
  }
}

let controls: MeasurementControls;
let setDuplicateCount: Dispatch<SetStateAction<number>>;
let animationFrames: Map<number, FrameRequestCallback>;
let nextAnimationFrameId: number;

const MeasurementHarness = ({
  isVertical = false,
}: {
  isVertical?: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [duplicateCount, updateDuplicateCount] = useState(1);

  controls = useMarqueeMeasurement({
    duplicateCount,
    isVertical,
    rootRef,
  });
  setDuplicateCount = updateDuplicateCount;

  return (
    <div
      ref={rootRef}
      className="gsap-react-marquee-container"
      data-measure-width={duplicateCount > 1 ? "160" : "100"}
      data-measure-height="40"
      style={{ height: 40, width: 100 }}
    >
      <div className="gsap-react-marquee">
        <div
          className="gsap-react-marquee-content"
          data-measure-width="40"
          data-measure-height="20"
          style={{ height: 20, width: 40 }}
        />
      </div>
    </div>
  );
};

const flushAnimationFrames = () => {
  const pendingFrames = Array.from(animationFrames.values());
  animationFrames.clear();
  pendingFrames.forEach((callback) => callback(performance.now()));
};

beforeEach(() => {
  InstrumentedResizeObserver.instances = [];
  animationFrames = new Map();
  nextAnimationFrameId = 1;

  vi.stubGlobal("ResizeObserver", InstrumentedResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const frameId = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.set(frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId: number) => {
    animationFrames.delete(frameId);
  });

  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
    function readTestWidth(this: HTMLElement) {
      return Number(this.dataset.measureWidth ?? 0);
    }
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function readTestHeight(this: HTMLElement) {
      return Number(this.dataset.measureHeight ?? 0);
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useMarqueeMeasurement", () => {
  it("keeps one ResizeObserver across equivalent parent rerenders", () => {
    const { rerender } = render(<MeasurementHarness />);
    const observer = InstrumentedResizeObserver.instances[0];

    rerender(<MeasurementHarness />);

    expect(InstrumentedResizeObserver.instances).toHaveLength(1);
    expect(InstrumentedResizeObserver.instances[0]).toBe(observer);
    expect(controls.measurementVersion).toBe(1);
  });

  it("ignores clone root deliveries and accepts a genuinely external resize", () => {
    const { container } = render(<MeasurementHarness />);
    const root = container.querySelector<HTMLElement>(
      ".gsap-react-marquee-container"
    );
    if (!root) throw new Error("Measurement root is missing");

    const observer = InstrumentedResizeObserver.instances[0];
    expect(observer).toBeDefined();
    expect(controls.measurementVersion).toBe(1);
    expect(controls.measurementSnapshotRef.current?.viewportSize).toBe(100);

    act(() => {
      const snapshot = controls.measurementSnapshotRef.current;
      if (!snapshot) throw new Error("Initial snapshot is missing");
      controls.beginCloneApplication(snapshot);
      setDuplicateCount(3);
    });

    act(() => observer.emit(root));
    expect(controls.measurementVersion).toBe(1);

    act(() => flushAnimationFrames());
    act(() => {
      observer.emit(root);
      observer.emit(root);
      observer.emit(root);
    });
    expect(controls.measurementVersion).toBe(1);

    act(() => {
      root.dataset.measureWidth = "220";
      root.style.width = "220px";
      observer.emit(root);
    });

    expect(controls.measurementVersion).toBe(2);
    expect(controls.measurementSnapshotRef.current).toMatchObject({
      contentSize: 40,
      rootSize: 220,
      viewportSize: 220,
    });
  });

  it("keeps the viewport snapshot when first-content size changes", () => {
    const { container } = render(<MeasurementHarness />);
    const root = container.querySelector<HTMLElement>(
      ".gsap-react-marquee-container"
    );
    const content = container.querySelector<HTMLElement>(
      ".gsap-react-marquee-content"
    );
    if (!root || !content) throw new Error("Measurement elements are missing");

    const observer = InstrumentedResizeObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => {
      const snapshot = controls.measurementSnapshotRef.current;
      if (!snapshot) throw new Error("Initial snapshot is missing");
      controls.beginCloneApplication(snapshot);
      setDuplicateCount(3);
    });
    act(() => flushAnimationFrames());

    act(() => {
      content.dataset.measureWidth = "50";
      content.style.width = "50px";
      observer.emit(content, root);
    });

    expect(controls.measurementVersion).toBe(2);
    expect(controls.measurementSnapshotRef.current).toMatchObject({
      contentSize: 50,
      rootSize: 100,
      viewportSize: 100,
    });

    act(() => observer.emit(root));
    expect(controls.measurementVersion).toBe(2);
  });

  it("compares measured sizes with the documented pixel tolerance", () => {
    expect(isSameMeasuredSize(100, 100.5)).toBe(true);
    expect(isSameMeasuredSize(100, 100.51)).toBe(false);
    expect(isSameMeasuredSize(null, 100)).toBe(false);
  });

  it("accepts a simultaneous external resize before applying clones", () => {
    const { container } = render(<MeasurementHarness />);
    const root = container.querySelector<HTMLElement>(
      ".gsap-react-marquee-container"
    );
    if (!root) throw new Error("Measurement root is missing");

    const snapshot = controls.measurementSnapshotRef.current;
    if (!snapshot) throw new Error("Initial snapshot is missing");

    let canApplyClones = true;
    act(() => {
      root.dataset.measureWidth = "220";
      canApplyClones = controls.beginCloneApplication(snapshot);
    });

    expect(canApplyClones).toBe(false);
    expect(controls.measurementVersion).toBe(2);
    expect(controls.measurementSnapshotRef.current).toMatchObject({
      contentSize: 40,
      rootSize: 220,
      viewportSize: 220,
    });
  });

  it("replaces the snapshot once when the active axis changes", () => {
    const { rerender } = render(<MeasurementHarness />);

    expect(controls.measurementVersion).toBe(1);
    expect(controls.measurementSnapshotRef.current).toMatchObject({
      axis: "horizontal",
      contentSize: 40,
      rootSize: 100,
      viewportSize: 100,
    });

    rerender(<MeasurementHarness isVertical />);

    expect(controls.measurementVersion).toBe(2);
    expect(controls.measurementSnapshotRef.current).toMatchObject({
      axis: "vertical",
      contentSize: 20,
      rootSize: 40,
      viewportSize: 40,
    });
  });
});
