import { gsap } from "gsap";
import { Observer } from "gsap/Observer.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GSAPReactMarquee from "../../src/components/gsap-react-marquee";
import type { GSAPReactMarqueeProps } from "../../src/components/types/gsap-react-marquee.type";
import "./fixture.css";

type FixtureOptions = Omit<GSAPReactMarqueeProps, "children">;
type FixtureContentVariant =
  | "accessibility"
  | "default"
  | "presentational"
  | "vertical-example"
  | "vertical-title";

const fixtureIconSource =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2361dafb'/%3E%3C/svg%3E";

const verticalExampleContent = (
  <div className="fixture-vertical-example">
    {["Next.js", "React", "TypeScript", "Tailwind CSS"].map((name) => (
      <div className="fixture-vertical-example-row" key={name}>
        <img
          alt={name}
          className="fixture-vertical-example-icon"
          height={64}
          src={fixtureIconSource}
          width={64}
        />
      </div>
    ))}
    <div className="fixture-vertical-example-row">
      <div className="fixture-vertical-example-gsap">GSAP</div>
    </div>
  </div>
);

const verticalTitleContent = (
  <div className="fixture-vertical-title">GSAP REACT MARQUEE</div>
);

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
const timelineIdentities = new WeakMap<gsap.core.Timeline, number>();
let nextTimelineIdentity = 1;
let observedBaseTimeline: gsap.core.Timeline | null = null;

const directMarqueeListenerTypes = new Set([
  "focusin",
  "focusout",
  "pointerenter",
  "pointerleave",
]);
const activeMarqueeListeners = new Set<
  EventListenerOrEventListenerObject
>();
const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

const isDirectMarqueeListener = (target: EventTarget, type: string) =>
  directMarqueeListenerTypes.has(type) &&
  target instanceof HTMLElement &&
  target.classList.contains("gsap-react-marquee-container");

EventTarget.prototype.addEventListener = function addEventListener(
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean
) {
  Reflect.apply(nativeAddEventListener, this, [type, listener, options]);

  if (listener && isDirectMarqueeListener(this, type)) {
    activeMarqueeListeners.add(listener);
  }
};

EventTarget.prototype.removeEventListener = function removeEventListener(
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: EventListenerOptions | boolean
) {
  Reflect.apply(nativeRemoveEventListener, this, [type, listener, options]);

  if (listener && isDirectMarqueeListener(this, type)) {
    activeMarqueeListeners.delete(listener);
  }
};

const getBaseTimelines = () =>
  gsap.globalTimeline
    .getChildren(true, false, true)
    .filter(
      (animation): animation is gsap.core.Timeline =>
        animation.data === "gsap-react-marquee-base"
    );

const observeTimeline = (timeline: gsap.core.Timeline) => {
  observedBaseTimeline = timeline;
  if (!timelineIdentities.has(timeline)) {
    timelineIdentities.set(timeline, nextTimelineIdentity);
    nextTimelineIdentity += 1;
  }
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
const initialContentVariant = searchParams.get("content");
let contentVariant: FixtureContentVariant =
  initialContentVariant === "accessibility" ||
  initialContentVariant === "presentational" ||
  initialContentVariant === "vertical-example" ||
  initialContentVariant === "vertical-title"
    ? initialContentVariant
    : "default";
const initialOptions: FixtureOptions =
  initialDirection === "left" ||
  initialDirection === "right" ||
  initialDirection === "up" ||
  initialDirection === "down"
    ? { dir: initialDirection }
    : {};

let currentOptions: FixtureOptions = initialOptions;

const renderContent = () => {
  if (contentVariant === "vertical-example") {
    return verticalExampleContent;
  }

  if (contentVariant === "vertical-title") {
    return verticalTitleContent;
  }

  if (contentVariant === "presentational") {
    return <span className="fixture-content">Presentational fixture</span>;
  }

  if (contentVariant === "accessibility") {
    return (
      <div className="fixture-content">
        <label id="fixture-label" htmlFor="fixture-input">
          Email
        </label>
        <input
          aria-labelledby="fixture-label"
          className="fixture-focus-target"
          id="fixture-input"
          name="email"
          readOnly
          value="original"
        />
        <a href="#fixture-input">Jump to email</a>
        <svg aria-labelledby="fixture-svg-title">
          <title id="fixture-svg-title">Decorative shape</title>
          <defs>
            <clipPath id="fixture-clip">
              <rect height="10" width="10" />
            </clipPath>
          </defs>
          <rect clipPath="url(#fixture-clip)" height="10" width="10" />
        </svg>
      </div>
    );
  }

  return (
    <div className="fixture-content">
      <button className="fixture-focus-target" type="button">
        Browser fixture
      </button>
    </div>
  );
};

const renderFixture = (options: FixtureOptions = {}) => {
  currentOptions = options;
  const marquee = (
    <GSAPReactMarquee {...options}>
      {renderContent()}
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
  setContentVariant(variant: FixtureContentVariant) {
    contentVariant = variant;
    renderFixture(currentOptions);
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
      identity: timelineIdentities.get(timeline) ?? 0,
      paused: timeline.paused(),
      progress: timeline.progress(),
      repeatValue: timeline.repeat(),
      reversed: timeline.reversed(),
      timeScale: timeline.timeScale(),
      totalTime: timeline.totalTime(),
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
  marqueeListenerCount() {
    return activeMarqueeListeners.size;
  },
  unmount() {
    root.unmount();
  },
};

renderFixture(initialOptions);
