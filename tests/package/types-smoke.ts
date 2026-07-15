import GSAPReactMarquee, {
  calculateDuplicateCount,
  type GSAPReactMarqueeProps,
} from "gsap-react-marquee";

const props: GSAPReactMarqueeProps = {
  children: "typed child",
  dir: "left",
  fill: false,
};

const duplicateCount: number = calculateDuplicateCount(100, 500, props);

void GSAPReactMarquee;
void duplicateCount;
