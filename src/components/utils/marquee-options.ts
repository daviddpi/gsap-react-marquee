import type { GSAPReactMarqueeProps } from "../types/gsap-react-marquee.type";

const DEFAULT_DELAY = 0;
const DEFAULT_LOOP = -1;
const DEFAULT_MAX_DUPLICATES = 100;
const DEFAULT_SCROLL_SPEED = 2.5;
const DEFAULT_SPACING = 16;
const DEFAULT_SPEED = 100;
const MAX_DUPLICATES_HARD_LIMIT = 250;
const MIN_SCROLL_SPEED = 1.1;
const MAX_SCROLL_SPEED = 4;

/** Numeric marquee options after validation and default application. */
export type NormalizedMarqueeOptions = {
  delay: number;
  loop: -1 | number;
  maxDuplicates: number;
  scrollSpeed: number;
  spacing: number;
  speed: number;
};

type NumericMarqueeOptions = Pick<
  GSAPReactMarqueeProps,
  | "delay"
  | "loop"
  | "maxDuplicates"
  | "scrollSpeed"
  | "spacing"
  | "speed"
>;

const isFiniteNumber = (value: number | undefined): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

/**
 * Validates numeric options before layout and animation code consume them.
 * Invalid values fall back silently to keep rerenders deterministic.
 */
export const normalizeMarqueeOptions = (
  options: NumericMarqueeOptions
): NormalizedMarqueeOptions => {
  const speed =
    isFiniteNumber(options.speed) && options.speed > 0
      ? options.speed
      : DEFAULT_SPEED;
  const spacing =
    isFiniteNumber(options.spacing) && options.spacing >= 0
      ? options.spacing
      : DEFAULT_SPACING;
  const delay =
    isFiniteNumber(options.delay) && options.delay >= 0
      ? options.delay
      : DEFAULT_DELAY;
  const finiteScrollSpeed = isFiniteNumber(options.scrollSpeed)
    ? options.scrollSpeed
    : DEFAULT_SCROLL_SPEED;
  const scrollSpeed = Math.min(
    MAX_SCROLL_SPEED,
    Math.max(MIN_SCROLL_SPEED, finiteScrollSpeed)
  );
  const loop =
    options.loop === DEFAULT_LOOP ||
    (isFiniteNumber(options.loop) &&
      Number.isInteger(options.loop) &&
      options.loop >= 0)
      ? options.loop
      : DEFAULT_LOOP;
  const configuredMaxDuplicates =
    isFiniteNumber(options.maxDuplicates) &&
    Number.isInteger(options.maxDuplicates) &&
    options.maxDuplicates > 0
      ? options.maxDuplicates
      : DEFAULT_MAX_DUPLICATES;
  const maxDuplicates = Math.min(
    configuredMaxDuplicates,
    MAX_DUPLICATES_HARD_LIMIT
  );

  return { delay, loop, maxDuplicates, scrollSpeed, spacing, speed };
};
