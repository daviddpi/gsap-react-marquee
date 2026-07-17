import type { CSSProperties, ReactNode } from "react";

export type GSAPReactMarqueeProps = {
  /**
   * @description Content rendered inside each marquee item.
   */
  children: ReactNode;

  /**
   * @description Additional CSS classes applied to each content wrapper.
   */
  className?: string;

  /**
   * @description Additional CSS classes applied only to the root viewport.
   */
  containerClassName?: string;

  /**
   * @description Inline styles applied to the root viewport. Width and height
   * can be used to provide an explicit measurement area.
   */
  containerStyle?: CSSProperties;

  /**
   * @description Direction of the marquee movement.
   * @type {"right" | "left" | "up" | "down"}
   * @default "left"
   */
  dir?: "right" | "left" | "up" | "down";

  /**
   * @description Number of timeline repeats. Accepts integer -1 for infinite
   * looping or an integer >= 0. Invalid values use -1.
   * @type {number}
   * @default -1
   */
  loop?: number;

  /**
   * @description Whether the marquee animation should start paused.
   * @type {boolean}
   * @default false
   */
  paused?: boolean;

  /**
   * @description Delay before the animation starts, in seconds. Negative or
   * non-finite values use 0.
   * @type {number}
   * @default 0
   */
  delay?: number;

  /**
   * @description Animation speed in pixels per second. Zero, negative, or
   * non-finite values use 100.
   * @type {number}
   * @default 100
   */
  speed?: number;

  /**
   * @description Whether short content should repeat enough times to cover the measured marquee area.
   * @type {boolean}
   * @default false
   */
  fill?: boolean;

  /**
   * @description Maximum number of additional clones rendered in fill mode.
   * Positive integers are accepted up to the internal safety ceiling.
   * @type {number}
   * @default 100
   */
  maxDuplicates?: number;

  /**
   * @description Pause the marquee while the pointer hovers the root container.
   * @type {boolean}
   * @default false
   */
  pauseOnHover?: boolean;

  /**
   * @description Enable edge gradient overlays.
   * @type {boolean}
   * @default false
   */
  gradient?: boolean;

  /**
   * @description Explicit gradient color. Overrides automatic background detection.
   * @type {string}
   */
  gradientColor?: string;

  /**
   * @description Gap between repeated marquee items, in pixels. Negative or
   * non-finite values use 16.
   * @type {number}
   * @default 16
   */
  spacing?: number;

  /**
   * @description Enable manual drag control for the marquee timeline.
   * @type {boolean}
   * @default false
   */
  draggable?: boolean;

  /**
   * @description Adjust timeline speed and direction from wheel movement.
   * @type {boolean}
   * @default false
   */
  scrollFollow?: boolean;

  /**
   * @description Speed multiplier used by scrollFollow. Finite values are
   * clamped between 1.1 and 4; non-finite values use 2.5.
   * @type {number}
   * @default 2.5
   */
  scrollSpeed?: number;
};
