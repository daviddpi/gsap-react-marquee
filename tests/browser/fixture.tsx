import { gsap } from "gsap";
import { Observer } from "gsap/all.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GSAPReactMarquee from "../../src/components/gsap-react-marquee";
import type { GSAPReactMarqueeProps } from "../../src/components/gsap-react-marquee.type";
import "./fixture.css";

type FixtureOptions = Omit<GSAPReactMarqueeProps, "children">;

const rootElement = document.querySelector<HTMLDivElement>("#root");
const fixtureElement = document.querySelector<HTMLDivElement>("#fixture");

if (!rootElement || !fixtureElement) {
  throw new Error("Browser fixture root is missing");
}

const root = createRoot(rootElement);
const searchParams = new URLSearchParams(window.location.search);
const timelineObservations = new WeakMap<
  gsap.core.Timeline,
  {
    complete: number;
    hasReverseContinuation: boolean;
    repeat: number;
    reverseComplete: number;
  }
>();
let observedBaseTimeline: gsap.core.Timeline | null = null;

const getBaseTimelines = () =>
  gsap.globalTimeline
    .getChildren(true, false, true)
    .filter(
      (animation): animation is gsap.core.Timeline =>
        animation.data === "gsap-react-marquee-base"
    );

const observeTimeline = (timeline: gsap.core.Timeline) => {
  observedBaseTimeline = timeline;
  if (timelineObservations.has(timeline)) return;

  const previousComplete = timeline.eventCallback("onComplete");
  const previousRepeat = timeline.eventCallback("onRepeat");
  const previousReverseComplete = timeline.eventCallback("onReverseComplete");
  const observation = {
    complete: 0,
    hasReverseContinuation: typeof previousReverseComplete === "function",
    repeat: 0,
    reverseComplete: 0,
  };
  timelineObservations.set(timeline, observation);

  timeline.eventCallback("onComplete", () => {
    observation.complete += 1;
    previousComplete?.();
  });
  timeline.eventCallback("onRepeat", () => {
    observation.repeat += 1;
    previousRepeat?.();
  });
  timeline.eventCallback("onReverseComplete", () => {
    observation.reverseComplete += 1;
    previousReverseComplete?.();
  });
};

const initialContentWidth = searchParams.get("contentWidth");
const initialContentHeight = searchParams.get("contentHeight");
if (initialContentWidth !== null) {
  fixtureElement.style.setProperty(
    "--fixture-content-width",
    `${Number(initialContentWidth)}px`
  );
}
if (initialContentHeight !== null) {
  fixtureElement.style.setProperty(
    "--fixture-content-height",
    `${Number(initialContentHeight)}px`
  );
}
if (searchParams.has("hidden")) fixtureElement.style.display = "none";

const initialDirection = searchParams.get("dir");
const initialOptions: FixtureOptions =
  initialDirection === "left" ||
  initialDirection === "right" ||
  initialDirection === "up" ||
  initialDirection === "down"
    ? { dir: initialDirection }
    : {};

const renderFixture = (options: FixtureOptions = {}) => {
  const marquee = (
    <GSAPReactMarquee {...options}>
      <div className="fixture-content">
        <button className="fixture-focus-target" type="button">
          Browser fixture
        </button>
      </div>
    </GSAPReactMarquee>
  );

  root.render(
    searchParams.has("strict") ? <StrictMode>{marquee}</StrictMode> : marquee
  );
};

window.__marqueeFixture = {
  render: renderFixture,
  setContainerSize(width: number, height: number) {
    fixtureElement.style.width = `${width}px`;
    fixtureElement.style.height = `${height}px`;
  },
  setContentSize(width: number, height: number) {
    fixtureElement.style.setProperty("--fixture-content-width", `${width}px`);
    fixtureElement.style.setProperty("--fixture-content-height", `${height}px`);
  },
  setDisplay(display: string) {
    fixtureElement.style.display = display;
  },
  timelineCount() {
    return gsap.globalTimeline.getChildren(true, false, true).length;
  },
  timelineDurations() {
    return gsap.globalTimeline
      .getChildren(true, true, true)
      .map((animation) => animation.duration());
  },
  baseTimelineState() {
    const activeTimeline = getBaseTimelines().at(-1);
    if (activeTimeline) observeTimeline(activeTimeline);

    const timeline = activeTimeline ?? observedBaseTimeline;
    if (!timeline) return null;

    const observation = timelineObservations.get(timeline) ?? {
      complete: 0,
      hasReverseContinuation: false,
      repeat: 0,
      reverseComplete: 0,
    };

    return {
      ...observation,
      active: timeline.isActive(),
      paused: timeline.paused(),
      progress: timeline.progress(),
      repeatValue: timeline.repeat(),
      reversed: timeline.reversed(),
      timeScale: timeline.timeScale(),
      totalProgress: timeline.totalProgress(),
    };
  },
  observeBaseTimeline() {
    const timeline = getBaseTimelines().at(-1);
    if (!timeline) return false;
    observeTimeline(timeline);
    return true;
  },
  resourceCounts() {
    const taggedAnimations = gsap.globalTimeline
      .getChildren(true, true, true)
      .filter(
        (animation) =>
          typeof animation.data === "string" &&
          animation.data.startsWith("gsap-react-marquee-")
      ).length;

    return {
      baseTimelines: getBaseTimelines().length,
      observers: Observer.getAll().length,
      taggedAnimations,
    };
  },
  unmount() {
    root.unmount();
  },
};

renderFixture(initialOptions);
