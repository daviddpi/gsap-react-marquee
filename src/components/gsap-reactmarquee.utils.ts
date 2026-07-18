import { type ClassValue, clsx } from "clsx";
import { gsap } from "gsap";
import { twMerge } from "tailwind-merge";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";
import type { MarqueeDraggablePlugins } from "./marquee-plugins";

let hasWarnedMissingInertiaPlugin = false;

const DEFAULT_DELAY = 0;
const DEFAULT_LOOP = -1;
const DEFAULT_MAX_DUPLICATES = 100;
const DEFAULT_SCROLL_SPEED = 2.5;
const DEFAULT_SPACING = 16;
const DEFAULT_SPEED = 100;
const MAX_DUPLICATES_HARD_LIMIT = 250;
const MIN_SCROLL_SPEED = 1.1;
const MAX_SCROLL_SPEED = 4;

type GSAPTimeline = ReturnType<typeof gsap.timeline>;

export type ResumeTimelineOptions = {
  timeline: GSAPTimeline;
  isReverse: boolean;
  paused: boolean;
};

/**
 * Restores the base marquee direction from controlled React state.
 * Interaction tweens may temporarily change timeScale, so every transition
 * resets it before applying play, reverse, or pause.
 */
export const resumeTimeline = ({
  timeline,
  isReverse,
  paused,
}: ResumeTimelineOptions): void => {
  timeline.timeScale(1);

  if (paused) {
    timeline.pause();
    return;
  }

  if (isReverse) {
    timeline.reverse();
    return;
  }

  timeline.play();
};

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
 * Normalizes every numeric option before it reaches layout or GSAP.
 *
 * Invalid values are intentionally handled silently. This keeps production
 * output deterministic without producing repeated warnings during rerenders.
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

/**
 * Returns true only when every supplied layout measurement is finite and
 * positive. Empty measurement sets are not usable.
 */
export const hasUsableMeasurement = (...measurements: number[]): boolean => {
  return (
    measurements.length > 0 &&
    measurements.every(
      (measurement) => Number.isFinite(measurement) && measurement > 0
    )
  );
};

const getRelativeOffset = (
  item: HTMLElement,
  container: HTMLElement,
  isVertical: boolean
): number => {
  let offset = 0;
  let current: HTMLElement | null = item;

  while (current && current !== container) {
    offset += isVertical ? current.offsetTop : current.offsetLeft;
    current = current.offsetParent as HTMLElement | null;
  }

  if (current === container) {
    return offset;
  }

  const itemRect = item.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return isVertical
    ? itemRect.top - containerRect.top
    : itemRect.left - containerRect.left;
};

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
  const { spacing } = normalizeMarqueeOptions(props);
  const usesContentTrack = props.fill ?? false;

  gsap.set(containerElement, {
    gap: `${spacing}px`,
    flexDirection: isVertical ? "column" : "row",
  });

  gsap.set(marqueeElements, {
    flexDirection: isVertical ? "column" : "row",
    gap: `${spacing}px`,
    [isVertical ? "minHeight" : "minWidth"]: usesContentTrack ? "auto" : "100%",
    flex: usesContentTrack ? "0 0 auto" : "1",
  });

  gsap.set(contentElements, {
    flexDirection: isVertical ? "column" : "row",
    overflow: isVertical ? "visible" : "hidden",
  });
};

/**
 * Public width-specific wrapper kept for consumers that import this utility
 *
 * @param element - Element to inspect
 * @returns true when the element has a reliable width
 */
export const hasDefinedWidth = (element: HTMLElement): boolean => {
  return hasUsableMeasurement(element.offsetWidth);
};

/**
 * Calculates the reference size used to decide how many clones are needed
 *
 * Uses the root viewport's current axis size. Clone-generated root changes are
 * filtered by the measurement snapshot lifecycle before this function runs, so
 * CSS computed-value heuristics are neither necessary nor reliable here.
 *
 * @param containerElement - Root marquee container
 * @param isVertical - Whether the marquee should measure height instead of width
 * @returns A stable target size for duplicate calculations
 */
export const getTargetSize = (
  containerElement: HTMLElement,
  isVertical: boolean
): number => {
  return isVertical
    ? containerElement.offsetHeight
    : containerElement.offsetWidth;
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
export type DuplicateCountResult = {
  duplicateCount: number;
  limitReached: boolean;
  requiredDuplicateCount: number;
};

export const calculateDuplicateCountResult = (
  contentSize: number,
  targetSize: number,
  props: GSAPReactMarqueeProps
): DuplicateCountResult => {
  const { fill = false } = props;
  const { maxDuplicates, spacing } = normalizeMarqueeOptions(props);

  if (!fill || !hasUsableMeasurement(contentSize, targetSize)) {
    return {
      duplicateCount: 1,
      limitReached: false,
      requiredDuplicateCount: 1,
    };
  }

  const itemExtent = contentSize + spacing;
  if (!hasUsableMeasurement(itemExtent)) {
    return {
      duplicateCount: 1,
      limitReached: false,
      requiredDuplicateCount: 1,
    };
  }

  const requiredTrack = targetSize + itemExtent;
  const totalItems = Math.ceil((requiredTrack + spacing) / itemExtent);
  const requiredDuplicateCount = Math.max(1, totalItems - 1);
  const duplicateCount = Math.min(requiredDuplicateCount, maxDuplicates);

  return {
    duplicateCount,
    limitReached: requiredDuplicateCount > maxDuplicates,
    requiredDuplicateCount,
  };
};

export const calculateDuplicateCount = (
  contentSize: number,
  targetSize: number,
  props: GSAPReactMarqueeProps
): number => {
  return calculateDuplicateCountResult(contentSize, targetSize, props)
    .duplicateCount;
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
  props: GSAPReactMarqueeProps,
  offsetContainer?: HTMLElement,
  getPaused?: () => boolean,
  draggablePlugins?: MarqueeDraggablePlugins
): (() => void) | undefined => {
  const { spacing, speed, delay, loop } = normalizeMarqueeOptions(props);
  const { paused = false, draggable = false } = props;
  const readPaused = getPaused ?? (() => paused);

  const lastIndex = items.length - 1;
  if (lastIndex < 0) return;

  const itemSizes: number[] = [];
  const initialPercents: number[] = [];
  const percentProperty = isVertical ? "yPercent" : "xPercent";
  const positionProperty = isVertical ? "y" : "x";
  const sizeProperty = isVertical ? "height" : "width";
  const getItemOffset = (item: HTMLElement) =>
    offsetContainer
      ? getRelativeOffset(item, offsetContainer, isVertical)
      : isVertical
        ? item.offsetTop
        : item.offsetLeft;
  const itemOffsets = items.map(getItemOffset);
  if (!itemOffsets.every(Number.isFinite)) return;

  /**
   * Capture each item's current pixel offset and convert it to a percent offset.
   * GSAP can animate percentage transforms more robustly across responsive sizes.
   */
  items.forEach((item, index) => {
    const itemSize = Number.parseFloat(
      String(gsap.getProperty(item, sizeProperty, "px"))
    );
    const pixelOffset = Number.parseFloat(
      String(gsap.getProperty(item, positionProperty, "px"))
    );
    const percentOffset = Number(gsap.getProperty(item, percentProperty));

    itemSizes[index] = itemSize;
    initialPercents[index] =
      hasUsableMeasurement(itemSize) &&
      Number.isFinite(pixelOffset) &&
      Number.isFinite(percentOffset)
        ? (pixelOffset / itemSize) * 100 + percentOffset
        : Number.NaN;
  });

  if (
    !itemSizes.every((itemSize) => hasUsableMeasurement(itemSize)) ||
    !initialPercents.every(Number.isFinite)
  ) {
    return;
  }

  /**
   * Track length is the full distance an item travels before it can wrap back.
   * It includes the last item's offset, its own size and the configured spacing.
   */
  const lastItem = items[lastIndex];
  const lastOffset = itemOffsets[lastIndex];
  const lastSize = isVertical ? lastItem.offsetHeight : lastItem.offsetWidth;
  const effectiveStartPosition = offsetContainer
    ? itemOffsets[0]
    : startPosition;
  const trackLength =
    lastOffset +
    (initialPercents[lastIndex] / 100) * itemSizes[lastIndex] -
    effectiveStartPosition +
    lastSize +
    spacing;

  if (
    !Number.isFinite(effectiveStartPosition) ||
    !hasUsableMeasurement(lastSize, trackLength)
  ) {
    return;
  }

  const segments = items.map((item, index) => {
    const itemSize = itemSizes[index];
    const currentPosition = (initialPercents[index] / 100) * itemSize;
    const itemOffset = itemOffsets[index];
    const distanceToStart =
      itemOffset + currentPosition - effectiveStartPosition;
    const distanceToLoop = distanceToStart + itemSize;
    const returnDistance = trackLength - distanceToLoop;
    const exitPercent = ((currentPosition - distanceToLoop) / itemSize) * 100;
    const entryPercent =
      ((currentPosition - distanceToLoop + trackLength) / itemSize) * 100;
    const exitDuration = distanceToLoop / speed;
    const returnDuration = returnDistance / speed;

    if (
      ![
        currentPosition,
        distanceToLoop,
        returnDistance,
        exitPercent,
        entryPercent,
        exitDuration,
        returnDuration,
      ].every(Number.isFinite) ||
      distanceToLoop < 0 ||
      returnDistance < 0 ||
      exitDuration < 0 ||
      returnDuration < 0
    ) {
      return null;
    }

    return {
      entryPercent,
      exitDuration,
      exitPercent,
      item,
      returnDuration,
    };
  });

  if (segments.some((segment) => segment === null)) return;

  gsap.set(items, {
    [percentProperty]: (index: number) => initialPercents[index],
  });
  gsap.set(items, { [positionProperty]: 0 });

  segments.forEach((segment, index) => {
    if (!segment) return;

    /**
     * First segment moves the item out of view. Second segment starts it at the
     * far end of the track and returns it to its original percent position.
     */
    timeline
      .to(
        segment.item,
        {
          [percentProperty]: segment.exitPercent,
          duration: segment.exitDuration,
        },
        0
      )
      .fromTo(
        segment.item,
        {
          [percentProperty]: segment.entryPercent,
        },
        {
          [percentProperty]: initialPercents[index],
          duration: segment.returnDuration,
          immediateRender: false,
        },
        segment.exitDuration
      );
  });

  let reverseDelayTween: gsap.core.Tween | undefined;
  let throwDelayTween: gsap.core.Tween | undefined;
  type DraggableInstance = ReturnType<
    MarqueeDraggablePlugins["Draggable"]["create"]
  >[number];
  let draggableInstance: DraggableInstance | undefined;
  let dragProxyElement: HTMLElement | undefined;

  const restoreControlledState = () => {
    resumeTimeline({
      timeline,
      isReverse,
      paused: readPaused(),
    });
  };

  const scheduleReverseResume = (data: string) => {
    const delayedCall = gsap.delayedCall(delay, () => {
      restoreControlledState();
    });
    delayedCall.data = data;
    return delayedCall;
  };

  timeline.eventCallback("onReverseComplete", null);

  if (loop === -1) {
    timeline.eventCallback("onReverseComplete", () => {
      timeline.totalTime(timeline.rawTime() + timeline.duration() * 100);
    });
  }

  if (isReverse) {
    if (loop === -1) {
      timeline.progress(1).pause();
    } else {
      timeline.totalProgress(1).pause();
    }

    if (readPaused() || delay === 0) {
      restoreControlledState();
    } else {
      reverseDelayTween = scheduleReverseResume(
        "gsap-react-marquee-reverse-delay"
      );
    }
  } else {
    timeline.delay(delay);
    restoreControlledState();
  }

  const Draggable = draggablePlugins?.Draggable;

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

    const restoreAfterDrag = () => {
      throwDelayTween?.kill();

      if (isReverse && delay > 0 && !readPaused()) {
        timeline.pause();
        throwDelayTween = scheduleReverseResume(
          "gsap-react-marquee-drag-delay"
        );
        return;
      }

      restoreControlledState();
    };

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

    const hasInertiaPlugin = Boolean(gsap.plugins.inertia);
    if (!hasInertiaPlugin && !hasWarnedMissingInertiaPlugin) {
      hasWarnedMissingInertiaPlugin = true;
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
        reverseDelayTween?.kill();
        throwDelayTween?.kill();
        draggableInstance?.tween?.kill();
        gsap.killTweensOf(dragProxy);
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
      inertia: hasInertiaPlugin,
      onRelease(this: DraggableInstance) {
        if (!this.isThrowing) restoreAfterDrag();
      },
      onThrowComplete() {
        restoreAfterDrag();
      },
    })[0];
  }

  return () => {
    reverseDelayTween?.kill();
    throwDelayTween?.kill();
    draggableInstance?.tween?.kill();
    draggableInstance?.kill();
    if (dragProxyElement) gsap.killTweensOf(dragProxyElement);
    dragProxyElement?.remove();
    timeline.eventCallback("onReverseComplete", null);
  };
};

export const coreAnimation = createMarqueeAnimation;
