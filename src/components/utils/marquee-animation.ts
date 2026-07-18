import { gsap } from "gsap";
import type { GSAPReactMarqueeProps } from "../types/gsap-react-marquee.type";
import { setupMarqueeDraggable } from "./marquee-draggable";
import { hasUsableMeasurement } from "./marquee-layout";
import type { MarqueeDraggablePlugins } from "./marquee-plugins";
import { normalizeMarqueeOptions } from "./marquee-options";

type GSAPTimeline = ReturnType<typeof gsap.timeline>;
type PercentProperty = "xPercent" | "yPercent";
type PositionProperty = "x" | "y";
type SizeProperty = "height" | "width";

type ItemGeometry = {
  effectiveStartPosition: number;
  initialPercents: number[];
  itemOffsets: number[];
  itemSizes: number[];
  trackLength: number;
};

type TimelineSegment = {
  entryPercent: number;
  exitDuration: number;
  exitPercent: number;
  item: HTMLElement;
  returnDuration: number;
};

export type ResumeTimelineOptions = {
  timeline: GSAPTimeline;
  isReverse: boolean;
  paused: boolean;
};

/** Restores configured direction and pause state after an interaction. */
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

  if (current === container) return offset;

  const itemRect = item.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return isVertical
    ? itemRect.top - containerRect.top
    : itemRect.left - containerRect.left;
};

const readItemGeometry = (
  items: HTMLElement[],
  startPosition: number,
  spacing: number,
  isVertical: boolean,
  percentProperty: PercentProperty,
  positionProperty: PositionProperty,
  sizeProperty: SizeProperty,
  offsetContainer?: HTMLElement
): ItemGeometry | null => {
  const itemSizes: number[] = [];
  const initialPercents: number[] = [];
  const getItemOffset = (item: HTMLElement) =>
    offsetContainer
      ? getRelativeOffset(item, offsetContainer, isVertical)
      : isVertical
        ? item.offsetTop
        : item.offsetLeft;
  const itemOffsets = items.map(getItemOffset);
  if (!itemOffsets.every(Number.isFinite)) return null;

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
    return null;
  }

  const lastIndex = items.length - 1;
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
    return null;
  }

  return {
    effectiveStartPosition,
    initialPercents,
    itemOffsets,
    itemSizes,
    trackLength,
  };
};

const calculateTimelineSegments = (
  items: HTMLElement[],
  geometry: ItemGeometry,
  speed: number
): TimelineSegment[] | null => {
  const {
    effectiveStartPosition,
    initialPercents,
    itemOffsets,
    itemSizes,
    trackLength,
  } = geometry;
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

  return segments.every(
    (segment): segment is TimelineSegment => segment !== null
  )
    ? segments
    : null;
};

const populateTimeline = (
  timeline: GSAPTimeline,
  segments: TimelineSegment[],
  initialPercents: number[],
  percentProperty: PercentProperty,
  positionProperty: PositionProperty
): void => {
  const items = segments.map(({ item }) => item);

  gsap.set(items, {
    [percentProperty]: (index: number) => initialPercents[index],
  });
  gsap.set(items, { [positionProperty]: 0 });

  segments.forEach((segment, index) => {
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
};

/**
 * Builds continuous loop segments and optional drag control on a GSAP timeline.
 *
 * @param items - Elements animated around the track.
 * @param startPosition - Initial offset of the first item on the active axis.
 * @param timeline - Timeline receiving loop segments.
 * @param isReverse - Whether movement runs right or down.
 * @param dragTrigger - Visible elements that initiate dragging.
 * @param isVertical - Whether the active axis is Y.
 * @param props - Timing, spacing, loop, pause, and drag options.
 * @param offsetContainer - Optional ancestor used for relative offsets.
 * @param getPaused - Reads current controlled/interaction pause state.
 * @param draggablePlugins - Optional loaded Draggable implementation.
 * @returns Cleanup for delayed calls, drag state, and timeline callbacks.
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

  if (items.length === 0) return;

  const percentProperty = isVertical ? "yPercent" : "xPercent";
  const positionProperty = isVertical ? "y" : "x";
  const sizeProperty = isVertical ? "height" : "width";
  const geometry = readItemGeometry(
    items,
    startPosition,
    spacing,
    isVertical,
    percentProperty,
    positionProperty,
    sizeProperty,
    offsetContainer
  );
  if (!geometry) return;

  const segments = calculateTimelineSegments(items, geometry, speed);
  if (!segments) return;

  populateTimeline(
    timeline,
    segments,
    geometry.initialPercents,
    percentProperty,
    positionProperty
  );

  let reverseDelayTween: gsap.core.Tween | undefined;

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

  const cleanupDraggable = setupMarqueeDraggable({
    cancelReverseDelay: () => reverseDelayTween?.kill(),
    delay,
    dragTrigger,
    enabled: draggable,
    isReverse,
    isVertical,
    plugins: draggablePlugins,
    positionProperty,
    readPaused,
    restoreControlledState,
    scheduleReverseResume,
    timeline,
    trackLength: geometry.trackLength,
  });

  return () => {
    reverseDelayTween?.kill();
    cleanupDraggable?.();
    timeline.eventCallback("onReverseComplete", null);
  };
};

/** Legacy alias retained for backward compatibility. */
export const coreAnimation = createMarqueeAnimation;
