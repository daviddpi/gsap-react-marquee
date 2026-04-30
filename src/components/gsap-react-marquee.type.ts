import type { ReactNode } from "react";

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
   * @description Direction of the marquee movement.
   * @type {"right" | "left" | "up" | "down"}
   * @default "left"
   */
  dir?: "right" | "left" | "up" | "down";

  /**
   * @description Number of timeline repeats. Use -1 for infinite looping.
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
   * @description Delay before the animation starts, in seconds.
   * @type {number}
   * @default 0
   */
  delay?: number;

  /**
   * @description Animation speed in pixels per second.
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
   * @description Gap between repeated marquee items, in pixels.
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
   * @description Speed multiplier used by scrollFollow. The runtime clamps it between 1.1 and 4.
   * @type {number}
   * @default 2.5
   */
  scrollSpeed?: number;
};
