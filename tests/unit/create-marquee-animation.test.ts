import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const delayedCalls: Array<{
    callback: () => void;
    data?: string;
    kill: ReturnType<typeof vi.fn>;
  }> = [];
  const draggableInstance = {
    isThrowing: false,
    kill: vi.fn(),
    startX: 0,
    startY: 0,
    tween: { kill: vi.fn() },
    x: 0,
    y: 0,
  };
  let draggableVars: Record<string, (...args: never[]) => void> | undefined;

  const create = vi.fn(
    (_target: HTMLElement, vars: Record<string, (...args: never[]) => void>) => {
      draggableVars = vars;
      return [draggableInstance];
    }
  );
  const Draggable = Object.assign(function DraggableMock() {}, { create });

  return {
    Draggable,
    create,
    delayedCalls,
    draggableInstance,
    get draggableVars() {
      return draggableVars;
    },
    getProperty: vi.fn(
      (_target: HTMLElement, property: string) =>
        property === "width" || property === "height" ? 100 : 0
    ),
    killTweensOf: vi.fn(),
    set: vi.fn(),
  };
});

vi.mock("gsap", () => ({
  gsap: {
    delayedCall: vi.fn((_delay: number, callback: () => void) => {
      const tween = { callback, data: undefined, kill: vi.fn() };
      mocks.delayedCalls.push(tween);
      return tween;
    }),
    getProperty: mocks.getProperty,
    killTweensOf: mocks.killTweensOf,
    set: mocks.set,
    utils: {
      wrap:
        (minimum: number, maximum: number) =>
        (value: number): number =>
          ((value - minimum) % (maximum - minimum) +
            (maximum - minimum)) %
            (maximum - minimum) +
          minimum,
    },
  },
}));

vi.mock("gsap/all.js", () => ({
  Draggable: mocks.Draggable,
  InertiaPlugin: {},
}));

import { createMarqueeAnimation } from "../../src/components/gsap-reactmarquee.utils";

type Timeline = Parameters<typeof createMarqueeAnimation>[2];

const createTimeline = () => {
  const callbacks = new Map<string, (() => void) | null>();
  const timeline = {
    delay: vi.fn(),
    duration: vi.fn(() => 1),
    eventCallback: vi.fn(
      function eventCallback(
        type: string,
        callback?: (() => void) | null
      ) {
        if (arguments.length === 1) return callbacks.get(type);
        callbacks.set(type, callback ?? null);
        return timeline;
      }
    ),
    fromTo: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    progress: vi.fn(),
    rawTime: vi.fn(() => 0.25),
    reverse: vi.fn(),
    timeScale: vi.fn(),
    totalProgress: vi.fn(),
    totalTime: vi.fn(),
    to: vi.fn(),
  };

  timeline.to.mockReturnValue(timeline);
  timeline.delay.mockReturnValue(timeline);
  timeline.fromTo.mockReturnValue(timeline);
  timeline.pause.mockReturnValue(timeline);
  timeline.play.mockReturnValue(timeline);
  timeline.progress.mockImplementation((value?: number) =>
    value === undefined ? 0.5 : timeline
  );
  timeline.reverse.mockReturnValue(timeline);
  timeline.timeScale.mockReturnValue(timeline);
  timeline.totalProgress.mockImplementation((value?: number) =>
    value === undefined ? 0.5 : timeline
  );
  timeline.totalTime.mockReturnValue(timeline);

  return { callbacks, timeline };
};

const createMeasuredElement = () => {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    offsetHeight: { configurable: true, value: 100 },
    offsetLeft: { configurable: true, value: 0 },
    offsetTop: { configurable: true, value: 0 },
    offsetWidth: { configurable: true, value: 100 },
  });
  return element;
};

const createAnimation = ({
  delay = 0,
  getPaused,
  isReverse = true,
  loop,
  paused = false,
}: {
  delay?: number;
  getPaused?: () => boolean;
  isReverse?: boolean;
  loop: number;
  paused?: boolean;
}) => {
  const { callbacks, timeline } = createTimeline();
  const item = createMeasuredElement();
  const trigger = createMeasuredElement();
  const cleanup = createMarqueeAnimation(
    [item],
    0,
    timeline as unknown as Timeline,
    isReverse,
    trigger,
    false,
    {
      children: null,
      delay,
      draggable: true,
      loop,
      paused,
      spacing: 16,
      speed: 100,
    },
    undefined,
    getPaused
  );

  return { callbacks, cleanup, timeline };
};

beforeEach(() => {
  mocks.create.mockClear();
  mocks.delayedCalls.length = 0;
  mocks.draggableInstance.kill.mockClear();
  mocks.draggableInstance.tween.kill.mockClear();
  mocks.getProperty.mockClear();
  mocks.killTweensOf.mockClear();
  mocks.set.mockClear();
});

describe("createMarqueeAnimation timeline control", () => {
  it("initializes finite reverse from total progress", () => {
    const { callbacks, timeline } = createAnimation({ loop: 2 });

    expect(timeline.totalProgress).toHaveBeenCalledWith(1);
    expect(timeline.progress).not.toHaveBeenCalledWith(1);
    expect(callbacks.get("onReverseComplete")).toBeNull();
    expect(timeline.reverse).toHaveBeenCalledOnce();
  });

  it("gives infinite reverse one continuation callback", () => {
    const { callbacks, timeline } = createAnimation({ loop: -1 });

    expect(timeline.progress).toHaveBeenCalledWith(1);
    expect(timeline.totalProgress).not.toHaveBeenCalledWith(1);

    callbacks.get("onReverseComplete")?.();
    expect(timeline.totalTime).toHaveBeenCalledWith(100.25);
  });

  it("keeps infinite forward continuous when scroll temporarily reverses", () => {
    const { callbacks, timeline } = createAnimation({
      isReverse: false,
      loop: -1,
    });

    callbacks.get("onReverseComplete")?.();
    expect(timeline.totalTime).toHaveBeenCalledWith(100.25);
  });

  it("creates Draggable while reverse playback is controlled paused", () => {
    createAnimation({ loop: -1, paused: true });

    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("uses onRelease when inertia does not start", () => {
    let paused = false;
    const { timeline } = createAnimation({
      getPaused: () => paused,
      loop: -1,
    });
    timeline.reverse.mockClear();

    mocks.draggableVars?.onRelease.call({ isThrowing: false });
    expect(timeline.reverse).toHaveBeenCalledOnce();

    paused = true;
    timeline.pause.mockClear();
    mocks.draggableVars?.onRelease.call({ isThrowing: false });
    expect(timeline.pause).toHaveBeenCalledOnce();
  });

  it("waits for onThrowComplete when inertia starts", () => {
    const { timeline } = createAnimation({
      getPaused: () => true,
      loop: -1,
    });
    timeline.pause.mockClear();

    mocks.draggableVars?.onRelease.call({ isThrowing: true });
    expect(timeline.pause).not.toHaveBeenCalled();

    mocks.draggableVars?.onThrowComplete();
    expect(timeline.pause).toHaveBeenCalledOnce();
  });

  it("rechecks controlled pause inside reverse delayed calls", () => {
    let paused = false;
    const { timeline } = createAnimation({
      delay: 1,
      getPaused: () => paused,
      loop: -1,
    });
    expect(mocks.delayedCalls).toHaveLength(1);

    paused = true;
    mocks.delayedCalls[0].callback();
    expect(timeline.pause).toHaveBeenCalled();
    expect(timeline.reverse).not.toHaveBeenCalled();
  });

  it("kills delayed calls, inertia, proxy tweens, and reverse callback", () => {
    const { callbacks, cleanup } = createAnimation({ delay: 1, loop: -1 });
    cleanup?.();

    expect(mocks.delayedCalls[0].kill).toHaveBeenCalledOnce();
    expect(mocks.draggableInstance.tween.kill).toHaveBeenCalledOnce();
    expect(mocks.draggableInstance.kill).toHaveBeenCalledOnce();
    expect(mocks.killTweensOf).toHaveBeenCalled();
    expect(callbacks.get("onReverseComplete")).toBeNull();
  });
});
