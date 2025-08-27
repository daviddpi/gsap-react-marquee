import type { ReactNode } from "react";

export type GSAPReactMarqueeProps = {
  /** Content to render inside the marquee */
  children: ReactNode;

  /** Additional CSS classes for styling */
  className?: string;

  /**
   * @description Direction of the marquee movement
   * @type {"right" | "left" | "up" | "down"}
   * @default "right"
   */
  dir?: "right" | "left" | "up" | "down";

  /**
   * @description The number of times the marquee should loop, -1 is equivalent to infinite
   * @type {number}
   * @default -1
   */
  loop?: number;

  /**
   * @description Whether the marquee animation should be paused
   * @type {boolean}
   * @default false
   */
  paused?: boolean;

  /**
   * @description Correctly orients (rotates) the content with respect to the Y axis.
   * Useful for vertical movement ("up" | "down") to keep items upright via rotation fix.
   * @issue ⚠️ Not recommended to use together with "left" or "right" direction, as it may cause layout issues.
   * @type {boolean}
   * @default false
   */
  alignRotationWithY?: boolean;

  /**
   * @description Delay before the animation starts
   * @type {number}
   * @default 0
   */
  delay?: number;

  /**
   * @description Speed of the marquee animation in px/s
   * @type {number}
   * @default 100
   */
  speed?: number;

  /**
   * @description Whether the marquee should continuously fill the space
   * @type {boolean}
   * @default false
   */
  fill?: boolean;

  /**
   * @description Pause the marquee when hovering
   * @type {boolean}
   * @default false
   */
  pauseOnHover?: boolean;

  /**
   * @description Enable gradient overlay
   * @type {boolean}
   * @default false
   */
  gradient?: boolean;

  /**
   * @description Color of the gradient if enabled
   * @type {string}
   */
  gradientColor?: string;

  /**
   * @description Spacing between repeated elements in px
   * @type {number}
   * @default 16
   */
  spacing?: number;

  /**
   * @description Enable dragging to scroll manually
   * @type {boolean}
   * @default false
   */
  draggable?: boolean;

  /**
   * @description Whether to sync with page scroll direction
   * @type {boolean}
   * @default false
   */
  followScrollDir?: boolean;

  /**
   * @description Speed factor when syncing with page scroll, max value is 4
   * @type {number}
   * @default 2.5
   */
  scrollSpeed?: number;
};
