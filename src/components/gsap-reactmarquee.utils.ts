import { clsx, type ClassValue } from "clsx";
import gsap from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all";
import { twMerge } from "tailwind-merge";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";

/**
 * Utility function to merge Tailwind classes with clsx
 *
 * Combines clsx for conditional classes with tailwind-merge to handle
 * conflicting Tailwind classes by keeping the last occurrence.
 * This prevents issues like "p-4 p-2" where both would be applied.
 *
 * @param inputs - Array of class values (strings, conditionals, objects)
 * @returns Merged and deduplicated class string
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Traverses the DOM tree upward to find the first non-transparent background color
 *
 * This function walks up the element hierarchy starting from the given element,
 * checking each parent's computed backgroundColor style until it finds a visible
 * (non-transparent) background color. This is useful for automatically detecting
 * the effective background behind an element for gradient overlays.
 *
 * The traversal stops at the first element with a visible background color,
 * which could be the element itself or any of its ancestors up to the document root.
 *
 * @param el - The HTMLElement to start the background color search from
 * @returns The first non-transparent background color found in the hierarchy,
 *          or "transparent" if no visible background is found
 *
 * @example
 * // Element with white parent background
 * const color = getEffectiveBackgroundColor(marqueeElement);
 * // Returns: "rgb(255, 255, 255)" or "#ffffff"
 *
 * @example
 * // Element with no background set anywhere in hierarchy
 * const color = getEffectiveBackgroundColor(marqueeElement);
 * // Returns: "transparent"
 */
export const getEffectiveBackgroundColor = (el: HTMLElement): string => {
  let current: HTMLElement | null = el;

  while (current) {
    const bg = window.getComputedStyle(current).backgroundColor;

    // Check if background color is visible (not transparent or rgba(0,0,0,0))
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return bg;
    }

    current = current.parentElement;
  }

  return "transparent"; // fallback when no visible background is found
};

/**
 * Sets up container styles and rotation handling for the marquee
 *
 * This function handles the complex styling requirements for different marquee orientations:
 *
 * 1. **Basic Setup**: Applies gap spacing and rotation for vertical marquees
 * 2. **Vertical Mode**: Rotates container 90° and adjusts width to parent height
 * 3. **Rotation Alignment**: Special mode for vertical text that remains readable
 *
 * @param containerMarquee - The main container element that holds all marquee instances
 * @param marquees - Array of individual marquee wrapper elements
 * @param marqueesChildren - Array of content container elements within each marquee
 * @param isVertical - Boolean indicating if marquee moves up/down instead of left/right
 * @param props - Configuration object containing spacing and alignment options
 */
export const setupContainerStyles = (
  containerMarquee: HTMLElement,
  marquees: HTMLElement[],
  marqueesChildren: HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
) => {
  const { spacing = 16, alignRotationWithY = false } = props;

  /**
   * Apply base container styling
   * - gap: Space between marquee elements (prevents content overlap)
   * - rotate: 90° rotation for vertical movement (transforms horizontal motion to vertical)
   */
  gsap.set(containerMarquee, {
    gap: `${spacing}px`,
    rotate: isVertical ? 90 : "0",
  });

  /**
   * Handle vertical marquee specific adjustments
   * When isVertical is true, the container is rotated 90°, so we need to:
   * 1. Set container width to match parent height (since it's rotated)
   * 2. Allow content to overflow visible bounds for smooth transitions
   */
  if (isVertical) {
    const parent = containerMarquee.parentNode as HTMLElement;
    gsap.set(containerMarquee, {
      width: parent.offsetHeight, // Width becomes the vertical space available
    });

    gsap.set(marqueesChildren, {
      overflow: "visible", // Prevents clipping during animation
    });
  }

  /**
   * Handle special rotation alignment mode
   *
   * This creates a complex layout where:
   * - The main container is rotated for vertical movement
   * - Individual content is counter-rotated to remain readable
   * - Content is repositioned to align properly within the rotated space
   *
   * Use case: Vertical text marquee where text remains horizontally readable
   */
  if (alignRotationWithY && marquees.length > 0) {
    const marqueeHeight = marquees[0].offsetHeight;

    // Center align items within the container
    gsap.set(containerMarquee, {
      alignItems: "center",
    });

    /**
     * Counter-rotate content and reposition for proper alignment
     *
     * - rotate: -90° counters the container's 90° rotation
     * - x: Horizontal offset to center content within rotated container
     * - width: Set to marquee height since dimensions are swapped after rotation
     * - flexWrap/wordBreak/whiteSpace: Handle text flow in constrained space
     */
    gsap.set(marqueesChildren, {
      rotate: -90, // Counter-rotate to keep text readable
      x: (containerMarquee.offsetWidth - spacing) / 2 - spacing, // Center horizontally
      display: "flex",
      flexWrap: "wrap", // Allow text to wrap within constrained width
      width: marqueeHeight, // Width constraint for wrapped text
      wordBreak: "break-all", // Force word breaking if necessary
      whiteSpace: "break-spaces", // Preserve spaces while allowing breaks
    });

    /**
     * Adjust marquee height to fit within the rotated container
     * Accounts for spacing to prevent overflow
     */
    gsap.set(marquees, {
      height: containerMarquee.offsetWidth - spacing,
    });
  }
};

/**
 * Calculates the number of content duplicates needed for seamless looping
 *
 * For smooth infinite scrolling, we need enough content copies to fill the visible area
 * plus buffer space. This prevents gaps when content loops back to the beginning.
 *
 * Algorithm:
 * 1. If not in fill mode, only one copy is needed (content already spans container)
 * 2. Determine target width (viewport height for vertical, container width for horizontal)
 * 3. Calculate how many copies fit in the target space, rounding up for complete coverage
 *
 * @param marqueeChildrenWidth - Width of a single content instance
 * @param containerMarqueeWidth - Width of the marquee container
 * @param isVertical - Whether the marquee scrolls vertically
 * @param props - Configuration object containing fill mode setting
 * @returns Number of content duplicates needed (minimum 1)
 */
export const calculateDuplicates = (
  marqueeChildrenWidth: number,
  containerMarqueeWidth: number,
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): number => {
  // If not filling, content presumably already spans the container
  if (!props.fill) return 1;

  /**
   * Determine the space we need to fill
   * - Vertical: Use viewport height (since container is rotated 90°)
   * - Horizontal: Use container width
   */
  const targetWidth = isVertical ? window.innerHeight : containerMarqueeWidth;

  /**
   * Calculate required duplicates
   * Math.ceil ensures we have enough copies to fully cover the target width
   * Even if the last copy is partially visible, it prevents gaps during looping
   */
  return marqueeChildrenWidth < targetWidth
    ? Math.ceil(targetWidth / marqueeChildrenWidth)
    : 1; // If content is already larger than target, one copy suffices
};

/**
 * Determines the minimum width for marquee elements based on content and container
 *
 * This function ensures marquee elements have appropriate dimensions for their content
 * and container context, handling different modes and orientations.
 *
 * Width determination logic:
 * 1. **Fill mode**: Auto width lets content size naturally
 * 2. **Rotation alignment**: Use content height as width (rotated dimensions)
 * 3. **Undersized content**: Stretch to 100% to fill container
 * 4. **Oversized content**: Use actual content width for overflow scrolling
 *
 * @param marqueesChildren - Array of content elements for dimension measurement
 * @param totalWidth - Combined width of all content elements
 * @param containerMarqueeWidth - Available container width
 * @param props - Configuration object containing fill and alignment settings
 * @returns CSS width value (string with units or number for pixels)
 */
export const getMinWidth = (
  marqueesChildren: HTMLElement[],
  totalWidth: number,
  containerMarqueeWidth: number,
  props: GSAPReactMarqueeProps
): string | number => {
  const { fill = false, alignRotationWithY = false } = props;

  // Fill mode: Let content size itself naturally
  if (fill) return "auto";

  /**
   * Rotation alignment mode: Use height as width
   * Since content is rotated 90°, height becomes the effective width
   */
  if (alignRotationWithY && marqueesChildren.length > 0) {
    return `${marqueesChildren[0].offsetHeight}px`;
  }

  /**
   * Content smaller than container: Stretch to fill
   * Prevents awkward gaps in the marquee display
   */
  if (totalWidth < containerMarqueeWidth) return "100%";

  /**
   * Content larger than container: Use actual content width
   * Allows content to overflow and scroll properly
   */
  return `${totalWidth}px`;
};

/**
 * Creates a complex marquee animation with seamless looping and draggable support
 *
 * This is the core animation engine that creates smooth, continuous scrolling.
 * It handles the complex math required for seamless looping by calculating
 * precise positions and durations for each content element.
 *
 * Animation Strategy:
 * 1. **Position Calculation**: Convert pixel positions to percentages for responsive scaling
 * 2. **Seamless Looping**: Calculate track length and loop points to prevent gaps
 * 3. **Staggered Animation**: Each element starts at different times for smooth flow
 * 4. **Direction Handling**: Support forward and reverse directions with proper timing
 * 5. **Integrated Draggable**: Optional support for drag interaction with manual control
 *
 * Technical Details:
 * - Uses xPercent for percentage-based positioning (responsive to element width changes)
 * - Creates two-part animation: main movement + seamless loop reset
 * - Calculates precise durations based on distance and speed for consistent motion
 * - Implements draggable with intelligent pause/resume animation handling
 *
 * @param elementsToAnimate - Array of DOM elements to animate (content or containers)
 * @param startX - Starting X position reference point
 * @param tl - GSAP timeline to add animations to
 * @param isReverse - Whether animation should play in reverse direction
 * @param draggableTrigger - Element(s) that will trigger the draggable functionality
 * @param isVertical - Whether the marquee scrolls vertically
 * @param props - Configuration object with spacing, speed, delay, and other settings
 */
export const coreAnimation = (
  elementsToAnimate: HTMLElement[],
  startX: number,
  tl: gsap.core.Timeline,
  isReverse: boolean,
  draggableTrigger: HTMLElement | HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): void => {
  const {
    spacing = 16,
    speed = 100,
    delay = 0,
    paused = false,
    alignRotationWithY = false,
  } = props;

  // Arrays to store calculated values for each element
  const widths: number[] = []; // Element widths in pixels
  const xPercents: number[] = []; // Current positions as percentages
  const latestPos = elementsToAnimate.length - 1; // Index of last element

  /**
   * Initialize positions and calculate percentage values
   *
   * GSAP's xPercent property positions elements relative to their own width:
   * - 0% = element's left edge at current x position
   * - -100% = element's right edge at current x position
   * - 100% = element positioned one full width to the right
   *
   * This approach makes animations responsive to width changes
   */
  gsap.set(elementsToAnimate, {
    xPercent: (i, el) => {
      // Get element width and store for later calculations
      const w = (widths[i] = parseFloat(
        String(gsap.getProperty(el, "width", "px"))
      ));

      /**
       * Calculate current position as percentage of element width
       * Combines pixel position with any existing percentage offset
       */
      xPercents[i] =
        (parseFloat(String(gsap.getProperty(el, "x", "px"))) / w) * 100 +
        Number(gsap.getProperty(el, "xPercent"));

      return xPercents[i];
    },
  });

  // Reset x position to 0 since we're now using xPercent for positioning
  gsap.set(elementsToAnimate, { x: 0 });

  /**
   * Calculate total track length for seamless looping
   *
   * Track length is the total distance content travels before looping back.
   * It includes:
   * - Distance from start to last element's left edge
   * - Last element's offset percentage in pixels
   * - Last element's full width
   * - Spacing gap after last element
   *
   * This ensures smooth transitions when content loops back to beginning
   */
  const trackLength =
    elementsToAnimate[latestPos].offsetLeft +
    (xPercents[latestPos] / 100) * widths[latestPos] -
    startX +
    elementsToAnimate[latestPos].offsetWidth +
    spacing;

  /**
   * Create staggered animation for each element
   *
   * Each element gets a two-part animation:
   * 1. Main movement: From start position to loop point
   * 2. Reset movement: From end of track back to start (seamless loop)
   */
  elementsToAnimate.forEach((item, i) => {
    // Current position in pixels
    const curX = (xPercents[i] / 100) * widths[i];

    // Distance from element to animation start point
    const distanceToStart = item.offsetLeft + curX - startX;

    /**
     * Calculate distance to complete loop point
     *
     * For rotation alignment mode, use height instead of width
     * since the element dimensions are effectively swapped
     */
    const distanceToLoop = alignRotationWithY
      ? distanceToStart + item.offsetHeight - spacing
      : distanceToStart + widths[i];

    /**
     * Part 1: Main animation - move from current position to loop point
     *
     * - Target: Position where element should loop back
     * - Duration: Based on distance and speed for consistent motion
     * - Start time: 0 (all elements start simultaneously but from different positions)
     */
    tl.to(
      item,
      {
        xPercent: ((curX - distanceToLoop) / widths[i]) * 100,
        duration: distanceToLoop / speed,
      },
      0 // Start immediately
    ).fromTo(
      item,
      {
        /**
         * Part 2 Start: Position element at end of track
         * This creates the illusion of seamless continuation
         */
        xPercent: ((curX - distanceToLoop + trackLength) / widths[i]) * 100,
      },
      {
        /**
         * Part 2 End: Move back to original start position
         * Completes the seamless loop cycle
         */
        xPercent: xPercents[i],
        duration: (curX - distanceToLoop + trackLength - curX) / speed,
        immediateRender: false, // Don't render start position immediately
      },
      distanceToLoop / speed // Start after main animation completes
    );
  });

  // Apply initial delay before starting animations
  tl.delay(delay);

  /**
   * Handle reverse direction animations
   *
   * For reverse marquees (right/down directions):
   * 1. Set timeline to end position
   * 2. Pause to prevent immediate playback
   * 3. Use delayed call to start reverse playback after initial delay
   * 4. Set up reverse completion handler for continuous looping
   */
  if (isReverse) {
    // If paused is requested, just pause and return
    if (paused) {
      tl.pause();
      return;
    }

    // Position timeline at end and pause
    tl.progress(1).pause();

    /**
     * Start reverse playback after delay
     * This creates the proper reverse scrolling effect
     */
    gsap.delayedCall(delay, () => {
      tl.reverse(); // Start playing backwards

      /**
       * Handle seamless looping in reverse direction
       * When reverse completes, restart from end position
       * This prevents new delay in continuous reverse scrolling
       */
      tl.eventCallback("onReverseComplete", () => {
        tl.totalTime(tl.rawTime() + tl.duration() * 100);
      });
    });
  }

  /**
   * ========================================
   * DRAGGABLE SECTION
   * ========================================
   *
   * Implements interactive drag functionality for manual marquee control.
   * When enabled, allows users to drag horizontally to control the animation
   * position in real-time.
   */

  // Essential variables for draggable functionality
  let proxy: HTMLElement;

  if (typeof Draggable === "function" && props.draggable) {
    // Create an invisible proxy element to handle drag calculations
    proxy = document.createElement("div");
    const wrap = gsap.utils.wrap(0, 1); // Wrapping function to keep values between 0 and 1
    let ratio: number; // Ratio to convert drag position to timeline progress
    let startProgress: number; // Timeline progress at drag start

    /**
     * Alignment function that syncs drag position with timeline progress
     * Converts mouse movement into animation progress
     */
    const align = () => {
      const axis = isVertical
        ? draggable.startY - draggable.y
        : draggable.startX - draggable.x;
      tl.progress(wrap(startProgress + axis * ratio));
    };

    // Check InertiaPlugin availability for momentum scrolling
    if (typeof InertiaPlugin === "undefined") {
      console.warn(
        "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
      );
    }

    const draggable = Draggable.create(proxy, {
      trigger: draggableTrigger, // Element that will trigger the drag
      type: isVertical ? "y" : "x",
      onPress() {
        // Initialization on click/touch
        gsap.killTweensOf(tl); // Stop any ongoing animations on timeline
        tl.pause(); // Pause main animation
        startProgress = tl.progress(); // Store current progress
        ratio = 1 / trackLength; // Calculate drag/progress ratio
        gsap.set(proxy, { x: startProgress / -ratio }); // Position the proxy
      },
      onDrag: align, // Call align during drag
      onThrowUpdate: align, // Call align during inertia
      overshootTolerance: 0, // No overshoot tolerance
      inertia: true, // Enable momentum scrolling
      onThrowComplete: () => {
        // Handle inertia completion
        if (isReverse) {
          // If paused is requested, stop and return
          if (paused) {
            tl.pause();
            return;
          }

          // Position timeline at correct position and pause
          tl.progress(tl.progress()).pause();

          /**
           * Start reverse playback after delay
           * This creates the proper reverse scrolling effect
           */
          gsap.delayedCall(delay, () => {
            tl.reverse(); // Start playing backwards

            /**
             * Handle seamless looping in reverse direction
             * When reverse completes, restart from end position
             * This prevents new delay in continuous reverse scrolling
             */
            tl.eventCallback("onReverseComplete", () => {
              tl.totalTime(tl.rawTime() + tl.duration() * 100);
            });
          });
        } else {
          // For normal direction, simply resume the animation
          tl.play();
        }
      },
    })[0];
  }
};
