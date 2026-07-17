import { gsap } from "gsap";
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
      <div className="fixture-content">Browser fixture</div>
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
};

renderFixture(initialOptions);
