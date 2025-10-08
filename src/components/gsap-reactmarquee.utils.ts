import { type ClassValue, clsx } from "clsx";
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
 * Sets up container styles for the marquee
 *
 * This function handles the styling requirements for different marquee orientations:
 *
 * 1. **Basic Setup**: Applies gap spacing
 * 2. **Vertical Mode**: Uses flex-direction: column for up/down movement
 * 3. **Horizontal Mode**: Uses default flex-direction: row for left/right movement
 *
 * @param containerMarquee - The main container element that holds all marquee instances
 * @param marquees - Array of individual marquee wrapper elements
 * @param marqueesChildren - Array of content container elements within each marquee
 * @param isVertical - Boolean indicating if marquee moves up/down instead of left/right
 * @param props - Configuration object containing spacing options
 */
export const setupContainerStyles = (
  containerMarquee: HTMLElement,
  marquees: HTMLElement[],
  marqueesChildren: HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
) => {
  const { spacing = 16 } = props;

  /**
   * Apply base container styling
   * - gap: Space between marquee elements (prevents content overlap)
   * - flexDirection: column for vertical, row for horizontal
   */
  gsap.set(containerMarquee, {
    gap: `${spacing}px`,
    flexDirection: isVertical ? "column" : "row",
  });

  gsap.set(marquees, {
    gap: `${spacing}px`,
  });

  /**
   * Handle vertical marquee specific adjustments
   * When isVertical is true, we use flex-direction: column
   */
  if (isVertical) {
    gsap.set(marqueesChildren, {
      overflow: "visible", // Prevents clipping during animation
    });
  }
};

/**
 * Checks if an element has an explicitly defined width
 *
 * Verifies if the element has a fixed width through:
 * - Inline CSS style
 * - CSS classes that define width
 * - Computed CSS properties that are not 'auto'
 *
 * @param element - The HTML element to check
 * @returns true if it has a defined width, false otherwise
 */
export const hasDefinedWidth = (element: HTMLElement): boolean => {
  // Check for inline width
  if (element.style.width && element.style.width !== "auto") {
    return true;
  }

  // Check computed styles
  const computedStyle = window.getComputedStyle(element);
  const width = computedStyle.width;

  // If width is 'auto' or undefined, container adapts to content
  if (width === "auto" || !width) {
    return false;
  }

  // Check if parent has dimensions that might influence this element
  const parent = element.parentElement;
  if (parent) {
    const parentStyle = window.getComputedStyle(parent);
    // If parent has auto width and this element has 100% width,
    // then this element will also adapt to content
    if (width === "100%" && parentStyle.width === "auto") {
      return false;
    }
  }

  return true;
};

/**
 * Calculates the appropriate width reference for duplicate calculations
 *
 * Intelligent strategy:
 * 1. If container has a defined width → use that
 * 2. If container adapts to content → use viewport to avoid recursive loops
 * 3. Always adds a safety margin to prevent edge cases
 *
 * @param containerElement - The marquee container element
 * @param isVertical - Whether the marquee is vertical
 * @returns The reference width to use for calculations
 */
export const getTargetWidth = (
  containerElement: HTMLElement,
  isVertical: boolean
): number => {
  if (hasDefinedWidth(containerElement)) {
    // Container has a fixed width, we can use it safely
    return isVertical
      ? containerElement.offsetHeight
      : containerElement.offsetWidth;
  } else {
    // Container adapts to content, use viewport to avoid loops
    console.info(
      "GSAPReactMarquee: Container has no defined width, using viewport as reference to prevent recursive expansion"
    );
    return isVertical ? window.innerHeight : window.innerWidth;
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
 * Determines the minimum width/height for marquee elements based on content and container
 *
 * This function ensures marquee elements have appropriate dimensions for their content
 * and container context, handling different modes and orientations.
 *
 * Dimension determination logic:
 * 1. **Fill mode**: Auto size lets content size naturally
 * 2. **Undersized content**: Stretch to 100% to fill container
 * 3. **Oversized content**: Use actual content size for overflow scrolling
 *
 * @param marqueesChildren - Array of content elements for dimension measurement
 * @param totalSize - Combined width/height of all content elements
 * @param containerSize - Available container width/height
 * @param isVertical - Whether the marquee is vertical
 * @param props - Configuration object containing fill settings
 * @returns CSS size value (string with units or number for pixels)
 */
export const getMinWidth = (
  totalSize: number,
  containerSize: number,
  props: GSAPReactMarqueeProps
): string | number => {
  const { fill = false } = props;

  // Fill mode: Let content size itself naturally
  if (fill) return "auto";

  /**
   * Content smaller than container: Stretch to fill
   * Prevents awkward gaps in the marquee display
   */
  if (totalSize < containerSize) return "100%";
  if (totalSize > containerSize) return `${totalSize}px`;

  /**
   * Content matches container: Use container size
   */
  return `${containerSize}px`;
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
 * - Uses xPercent/yPercent for percentage-based positioning (responsive to element size changes)
 * - Creates two-part animation: main movement + seamless loop reset
 * - Calculates precise durations based on distance and speed for consistent motion
 * - Implements draggable with intelligent pause/resume animation handling
 *
 * @param elementsToAnimate - Array of DOM elements to animate (content or containers)
 * @param startPos - Starting position reference point (X or Y based on orientation)
 * @param tl - GSAP timeline to add animations to
 * @param isReverse - Whether animation should play in reverse direction
 * @param draggableTrigger - Element(s) that will trigger the draggable functionality
 * @param isVertical - Whether the marquee scrolls vertically
 * @param props - Configuration object with spacing, speed, delay, and other settings
 */
export const coreAnimation = (
  elementsToAnimate: HTMLElement[],
  startPos: number,
  tl: gsap.core.Timeline,
  isReverse: boolean,
  draggableTrigger: HTMLElement | HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): void => {
  const { spacing = 16, speed = 100, delay = 0, paused = false } = props;

  // Arrays to store calculated values for each element
  const sizes: number[] = []; // Element widths/heights in pixels
  const percents: number[] = []; // Current positions as percentages
  const latestPos = elementsToAnimate.length - 1; // Index of last element

  // Determine which properties to use based on orientation
  const percentProp = isVertical ? "yPercent" : "xPercent";
  const posProp = isVertical ? "y" : "x";
  const sizeProp = isVertical ? "height" : "width";
  const offsetProp = isVertical ? "offsetTop" : "offsetLeft";

  /**
   * Initialize positions and calculate percentage values
   *
   * GSAP's xPercent/yPercent property positions elements relative to their own size:
   * - 0% = element's edge at current position
   * - -100% = element's opposite edge at current position
   * - 100% = element positioned one full size forward
   *
   * This approach makes animations responsive to size changes
   */
  gsap.set(elementsToAnimate, {
    [percentProp]: (i: number, el: HTMLElement) => {
      // Get element size and store for later calculations
      const size = (sizes[i] = parseFloat(
        String(gsap.getProperty(el, sizeProp, "px"))
      ));

      /**
       * Calculate current position as percentage of element size
       * Combines pixel position with any existing percentage offset
       */
      percents[i] =
        (parseFloat(String(gsap.getProperty(el, posProp, "px"))) / size) * 100 +
        Number(gsap.getProperty(el, percentProp));

      return percents[i];
    },
  });

  // Reset position to 0 since we're now using percent for positioning
  gsap.set(elementsToAnimate, { [posProp]: 0 });

  /**
   * Calculate total track length for seamless looping
   *
   * Track length is the total distance content travels before looping back.
   * It includes:
   * - Distance from start to last element's edge
   * - Last element's offset percentage in pixels
   * - Last element's full size
   * - Spacing gap after last element
   *
   * This ensures smooth transitions when content loops back to beginning
   */
  const lastElement = elementsToAnimate[latestPos];
  const lastOffset = isVertical
    ? lastElement.offsetTop
    : lastElement.offsetLeft;
  const lastSize = isVertical
    ? lastElement.offsetHeight
    : lastElement.offsetWidth;

  const trackLength =
    lastOffset +
    (percents[latestPos] / 100) * sizes[latestPos] -
    startPos +
    lastSize +
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
    const curPos = (percents[i] / 100) * sizes[i];

    // Distance from element to animation start point
    const elementOffset = isVertical ? item.offsetTop : item.offsetLeft;
    const distanceToStart = elementOffset + curPos - startPos;

    /**
     * Calculate distance to complete loop point
     */
    const distanceToLoop = distanceToStart + sizes[i];

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
        [percentProp]: ((curPos - distanceToLoop) / sizes[i]) * 100,
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
        [percentProp]:
          ((curPos - distanceToLoop + trackLength) / sizes[i]) * 100,
      },
      {
        /**
         * Part 2 End: Move back to original start position
         * Completes the seamless loop cycle
         */
        [percentProp]: percents[i],
        duration: (curPos - distanceToLoop + trackLength - curPos) / speed,
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
        gsap.set(proxy, { [posProp]: startProgress / -ratio }); // Position the proxy
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
