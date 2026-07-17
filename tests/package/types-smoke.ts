import GSAPReactMarquee, {
  calculateDuplicateCount,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  type GSAPReactMarqueeProps,
  type NormalizedMarqueeOptions,
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
const normalizedOptions: NormalizedMarqueeOptions = normalizeMarqueeOptions({
  speed: 100,
});
const usableMeasurement: boolean = hasUsableMeasurement(100, 500);

void GSAPReactMarquee;
void duplicateCount;
void normalizedOptions;
void usableMeasurement;
