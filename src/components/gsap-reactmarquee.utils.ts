import { type ClassValue, clsx } from "clsx";
import { gsap } from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all.js";
import { twMerge } from "tailwind-merge";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";

const CONTENT_SIZED_DIMENSIONS = new Set([
  "",
  "auto",
  "fit-content",
  "min-content",
  "max-content",
  "-moz-fit-content",
  "-webkit-fit-content",
]);

const MAX_DUPLICATES = 15;

type GSAPTimeline = ReturnType<typeof gsap.timeline>;

/**
 * Utility function to merge Tailwind classes with clsx
 *
 * Combines clsx for conditional class names with tailwind-merge to resolve
 * conflicting Tailwind utilities by keeping the last valid class.
 * This prevents issues like "p-4 p-2" where both utilities would otherwise
 * be present in the final className string.
 *
 * @param inputs - Class values accepted by clsx, including strings, arrays and objects
 * @returns A merged and deduplicated className string
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Traverses the DOM tree upward to find the first visible background color
 *
 * Gradient overlays need a color that matches the surface behind the marquee.
 * The root element itself may be transparent, so this function walks through
 * parents until it finds a non-transparent computed background color.
 *
 * @param el - Element where the background color search starts
 * @returns The first visible background color found, or "transparent" as fallback
 */
export const getEffectiveBackgroundColor = (el: HTMLElement): string => {
  let current: HTMLElement | null = el;

  while (current) {
    const backgroundColor = window.getComputedStyle(current).backgroundColor;

    if (
      backgroundColor &&
      backgroundColor !== "rgba(0, 0, 0, 0)" &&
      backgroundColor !== "transparent"
    ) {
      return backgroundColor;
    }

    current = current.parentElement;
  }

  return "transparent";
};

/**
 * Applies the base layout styles required by the marquee animation
 *
 * GSAP sets these values inline so the runtime layout matches the current
 * props even when direction or spacing changes. Vertical marquees need a
 * column flow and visible child overflow, while horizontal marquees use the
 * default row flow and hidden child overflow.
 *
 * @param containerElement - Root marquee container
 * @param marqueeElements - Repeated marquee wrapper elements
 * @param contentElements - Content elements inside each marquee wrapper
 * @param isVertical - Whether the marquee moves on the Y axis
 * @param props - Component props used for spacing
 */
export const setupContainerStyles = (
  containerElement: HTMLElement,
  marqueeElements: HTMLElement[],
  contentElements: HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
) => {
  const { spacing = 16 } = props;

  gsap.set(containerElement, {
    gap: `${spacing}px`,
    flexDirection: isVertical ? "column" : "row",
  });

  gsap.set(marqueeElements, {
    gap: `${spacing}px`,
  });

  gsap.set(contentElements, {
    overflow: isVertical ? "visible" : "hidden",
  });
};

/**
 * Checks whether an element has a reliable fixed dimension
 *
 * A marquee inside a content-sized container can recursively expand while we
 * add duplicates. This helper distinguishes real dimensions from values that
 * depend on content, such as auto, fit-content, min-content and max-content.
 *
 * @param element - Element to inspect
 * @param dimension - CSS dimension to check, either width or height
 * @returns true when the element can be measured directly
 */
const hasDefinedDimension = (
  element: HTMLElement,
  dimension: "width" | "height"
): boolean => {
  const inlineValue = element.style[dimension];

  if (inlineValue) {
    return !CONTENT_SIZED_DIMENSIONS.has(inlineValue);
  }

  const computedValue = window.getComputedStyle(element)[dimension];

  if (CONTENT_SIZED_DIMENSIONS.has(computedValue)) {
    return false;
  }

  const parent = element.parentElement;
  if (!parent) return true;

  const parentValue = window.getComputedStyle(parent)[dimension];
  return !(
    computedValue === "100%" && CONTENT_SIZED_DIMENSIONS.has(parentValue)
  );
};

/**
 * Public width-specific wrapper kept for consumers that import this utility
 *
 * @param element - Element to inspect
 * @returns true when the element has a reliable width
 */
export const hasDefinedWidth = (element: HTMLElement): boolean => {
  return hasDefinedDimension(element, "width");
};

/**
 * Calculates the reference size used to decide how many clones are needed
 *
 * Strategy:
 * 1. If the container has a reliable size, use that measured size.
 * 2. If the container adapts to content, use the viewport as a stable fallback.
 *
 * The viewport fallback prevents recursive expansion in layouts where the
 * container grows as duplicated children are added.
 *
 * @param containerElement - Root marquee container
 * @param isVertical - Whether the marquee should measure height instead of width
 * @returns A stable target size for duplicate calculations
 */
export const getTargetSize = (
  containerElement: HTMLElement,
  isVertical: boolean
): number => {
  const dimension = isVertical ? "height" : "width";

  if (hasDefinedDimension(containerElement, dimension)) {
    return isVertical
      ? containerElement.offsetHeight
      : containerElement.offsetWidth;
  }

  return isVertical ? window.innerHeight : window.innerWidth;
};

export const getTargetWidth = getTargetSize;

/**
 * Calculates how many cloned items should be rendered
 *
 * The component always renders the original item. This function returns the
 * number of additional clones needed. In fill mode, short content is repeated
 * until the measured target area is covered. The count is capped to avoid
 * excessive DOM growth when content is extremely small or measurements are odd.
 *
 * @param contentSize - Width or height of one content item
 * @param targetSize - Width or height that should be covered
 * @param props - Component props, specifically fill mode
 * @returns Number of cloned marquee items to render
 */
export const calculateDuplicateCount = (
  contentSize: number,
  targetSize: number,
  props: GSAPReactMarqueeProps
): number => {
  const { fill = false } = props;

  if (!fill || contentSize <= 0 || targetSize <= 0) return 1;

  const duplicateCount =
    contentSize < targetSize ? Math.ceil(targetSize / contentSize) : 1;

  return Math.min(duplicateCount, MAX_DUPLICATES);
};

export const calculateDuplicates = calculateDuplicateCount;

/**
 * Determines the minimum size assigned to each marquee wrapper
 *
 * Normal mode stretches undersized content so the two wrapper items can fill
 * the container cleanly. Oversized content keeps its measured size so the
 * animation distance matches the real track. Fill mode uses auto sizing because
 * the repeated content elements themselves define the track length.
 *
 * @param itemSize - Measured width or height for one marquee item
 * @param containerSize - Available width or height of the root container
 * @param props - Component props, specifically fill mode
 * @returns CSS min-width/min-height value
 */
export const getMinSize = (
  itemSize: number,
  containerSize: number,
  props: GSAPReactMarqueeProps
): string | number => {
  const { fill = false } = props;

  if (fill) return "auto";
  if (itemSize <= containerSize) return "100%";
  return `${itemSize}px`;
};

export const getMinWidth = getMinSize;

/**
 * Creates the GSAP timeline segments that make the marquee loop continuously
 *
 * Each item gets two timeline segments:
 * 1. Move from its current position to the loop boundary.
 * 2. Re-enter from the end of the track back to its original position.
 *
 * Positions are converted to xPercent/yPercent so the animation remains stable
 * when item sizes change after measurement. Optional draggable support maps
 * pointer movement to timeline progress through a hidden proxy element.
 *
 * @param items - DOM elements that should move in the timeline
 * @param startPosition - Initial X/Y offset of the first content item
 * @param timeline - GSAP timeline that receives all animation segments
 * @param isReverse - Whether the marquee moves right/down instead of left/up
 * @param dragTrigger - Visible elements that should start drag interactions
 * @param isVertical - Whether the animation uses Y axis properties
 * @param props - Component props used for spacing, speed, delay and dragging
 * @returns Cleanup function for delayed calls, Draggable and proxy DOM nodes
 */
export const createMarqueeAnimation = (
  items: HTMLElement[],
  startPosition: number,
  timeline: GSAPTimeline,
  isReverse: boolean,
  dragTrigger: HTMLElement | HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): (() => void) | undefined => {
  const {
    spacing = 16,
    speed = 100,
    delay = 0,
    paused = false,
    draggable = false,
  } = props;

  const lastIndex = items.length - 1;
  if (lastIndex < 0) return;

  const itemSizes: number[] = [];
  const initialPercents: number[] = [];
  const percentProperty = isVertical ? "yPercent" : "xPercent";
  const positionProperty = isVertical ? "y" : "x";
  const sizeProperty = isVertical ? "height" : "width";

  /**
   * Capture each item's current pixel offset and convert it to a percent offset.
   * GSAP can animate percentage transforms more robustly across responsive sizes.
   */
  gsap.set(items, {
    [percentProperty]: (index: number, item: HTMLElement) => {
      const itemSize = parseFloat(
        String(gsap.getProperty(item, sizeProperty, "px"))
      );
      const pixelOffset = parseFloat(
        String(gsap.getProperty(item, positionProperty, "px"))
      );
      const percentOffset = Number(gsap.getProperty(item, percentProperty));

      itemSizes[index] = itemSize;
      initialPercents[index] = (pixelOffset / itemSize) * 100 + percentOffset;

      return initialPercents[index];
    },
  });

  gsap.set(items, { [positionProperty]: 0 });

  /**
   * Track length is the full distance an item travels before it can wrap back.
   * It includes the last item's offset, its own size and the configured spacing.
   */
  const lastItem = items[lastIndex];
  const lastOffset = isVertical ? lastItem.offsetTop : lastItem.offsetLeft;
  const lastSize = isVertical ? lastItem.offsetHeight : lastItem.offsetWidth;
  const trackLength =
    lastOffset +
    (initialPercents[lastIndex] / 100) * itemSizes[lastIndex] -
    startPosition +
    lastSize +
    spacing;

  items.forEach((item, index) => {
    const itemSize = itemSizes[index];
    const currentPosition = (initialPercents[index] / 100) * itemSize;
    const itemOffset = isVertical ? item.offsetTop : item.offsetLeft;
    const distanceToStart = itemOffset + currentPosition - startPosition;
    const distanceToLoop = distanceToStart + itemSize;

    /**
     * First segment moves the item out of view. Second segment starts it at the
     * far end of the track and returns it to its original percent position.
     */
    timeline
      .to(
        item,
        {
          [percentProperty]:
            ((currentPosition - distanceToLoop) / itemSize) * 100,
          duration: distanceToLoop / speed,
        },
        0
      )
      .fromTo(
        item,
        {
          [percentProperty]:
            ((currentPosition - distanceToLoop + trackLength) / itemSize) * 100,
        },
        {
          [percentProperty]: initialPercents[index],
          duration: (trackLength - distanceToLoop) / speed,
          immediateRender: false,
        },
        distanceToLoop / speed
      );
  });

  timeline.delay(delay);

  let reverseDelayTween: gsap.core.Tween | undefined;
  let throwDelayTween: gsap.core.Tween | undefined;
  let draggableInstance: ReturnType<typeof Draggable.create>[number] | undefined;
  let dragProxyElement: HTMLElement | undefined;

  // GSAP reverse timelines need their totalTime pushed forward to repeat continuously.
  const keepReverseLooping = () => {
    timeline.eventCallback("onReverseComplete", () => {
      timeline.totalTime(timeline.rawTime() + timeline.duration() * 100);
    });
  };

  const playReverseAfterDelay = () => {
    return gsap.delayedCall(delay, () => {
      timeline.reverse();
      keepReverseLooping();
    });
  };

  if (isReverse) {
    if (paused) {
      timeline.pause();
      return undefined;
    }

    timeline.progress(1).pause();
    reverseDelayTween = playReverseAfterDelay();
  }

  if (typeof Draggable === "function" && draggable) {
    /**
     * Draggable needs a mutable proxy element to store drag coordinates.
     * The proxy is never shown; the visible marquee elements remain the trigger.
     */
    const dragProxy = document.createElement("div");
    dragProxyElement = dragProxy;

    const wrapProgress = gsap.utils.wrap(0, 1);
    let dragRatio: number;
    let dragStartProgress: number;

    /**
     * Converts drag distance into timeline progress. The wrap function keeps the
     * result between 0 and 1 so users can drag through loop boundaries smoothly.
     */
    const syncTimelineToDrag = () => {
      if (!draggableInstance) return;

      const dragDelta = isVertical
        ? draggableInstance.startY - draggableInstance.y
        : draggableInstance.startX - draggableInstance.x;

      timeline.progress(
        wrapProgress(dragStartProgress + dragDelta * dragRatio)
      );
    };

    if (typeof InertiaPlugin === "undefined") {
      console.warn(
        "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
      );
    }

    draggableInstance = Draggable.create(dragProxy, {
      trigger: dragTrigger,
      type: isVertical ? "y" : "x",
      onPress() {
        /**
         * Store the current timeline progress before dragging starts.
         * The proxy position is aligned to that progress so Draggable deltas map
         * back to the same timeline point without a visible jump.
         */
        gsap.killTweensOf(timeline);
        timeline.pause();
        dragStartProgress = timeline.progress();
        dragRatio = 1 / trackLength;
        gsap.set(dragProxy, {
          [positionProperty]: dragStartProgress / -dragRatio,
        });
      },
      onDrag: syncTimelineToDrag,
      onThrowUpdate: syncTimelineToDrag,
      overshootTolerance: 0,
      inertia: true,
      onThrowComplete() {
        if (!isReverse) {
          timeline.play();
          return;
        }

        if (paused) {
          timeline.pause();
          return;
        }

        timeline.progress(timeline.progress()).pause();
        throwDelayTween?.kill();
        throwDelayTween = playReverseAfterDelay();
      },
    })[0];
  }

  return () => {
    reverseDelayTween?.kill();
    throwDelayTween?.kill();
    draggableInstance?.kill();
    dragProxyElement?.remove();
  };
};

export const coreAnimation = createMarqueeAnimation;
