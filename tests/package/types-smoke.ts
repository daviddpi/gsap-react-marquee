import GSAPReactMarquee, {
  calculateDuplicateCount,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  type GSAPReactMarqueeProps,
  type NormalizedMarqueeOptions,
} from "gsap-react-marquee";

const props: GSAPReactMarqueeProps = {
  children: "typed child",
  containerClassName: "typed-root",
  containerStyle: { height: 320 },
  dir: "left",
  fill: false,
  maxDuplicates: 50,
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
