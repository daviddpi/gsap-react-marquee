import GSAPReactMarquee, {
  calculateDuplicateCount,
  calculateDuplicateCountResult,
  calculateDuplicates,
  coreAnimation,
  createMarqueeAnimation,
  getMinSize,
  getMinWidth,
  getTargetSize,
  getTargetWidth,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  type DuplicateCountResult,
  type GSAPReactMarqueeProps,
  type NormalizedMarqueeOptions,
  type ResumeTimelineOptions,
} from "gsap-react-marquee";

const props: GSAPReactMarqueeProps = {
  children: "typed child",
  className: "typed-content",
  containerClassName: "typed-root",
  containerProps: {
    "aria-label": "Typed marquee",
    "data-package-smoke": true,
    role: "region",
  },
  containerStyle: { height: 320 },
  dir: "up",
  loop: 2,
  paused: true,
  delay: 0,
  speed: 120,
  fill: true,
  maxDuplicates: 50,
  pauseOnHover: true,
  gradient: true,
  gradientColor: "#000",
  spacing: 12,
  draggable: true,
  scrollFollow: true,
  scrollSpeed: 3,
  respectReducedMotion: true,
};

const duplicateCount: number = calculateDuplicateCount(100, 500, props);
const duplicateResult: DuplicateCountResult = calculateDuplicateCountResult(
  100,
  500,
  props
);
const normalizedOptions: NormalizedMarqueeOptions = normalizeMarqueeOptions({
  speed: 100,
});
const resumeOptions: ResumeTimelineOptions | undefined = undefined;
const usableMeasurement: boolean = hasUsableMeasurement(100, 500);
const utilityAliases: boolean[] = [
  calculateDuplicates === calculateDuplicateCount,
  coreAnimation === createMarqueeAnimation,
  getMinWidth === getMinSize,
  getTargetWidth === getTargetSize,
];

void GSAPReactMarquee;
void duplicateCount;
void duplicateResult;
void normalizedOptions;
void resumeOptions;
void usableMeasurement;
void utilityAliases;
