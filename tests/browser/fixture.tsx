import { gsap } from "gsap";
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

const renderFixture = (options: FixtureOptions = {}) => {
  root.render(
    <GSAPReactMarquee {...options}>
      <div className="fixture-content">Browser fixture</div>
    </GSAPReactMarquee>
  );
};

window.__marqueeFixture = {
  render: renderFixture,
  setContainerSize(width: number, height: number) {
    fixtureElement.style.width = `${width}px`;
    fixtureElement.style.height = `${height}px`;
  },
  timelineDurations() {
    return gsap.globalTimeline
      .getChildren(true, true, true)
      .map((animation) => animation.duration());
  },
};

renderFixture();
