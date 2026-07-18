import { type ClassValue, clsx } from "clsx";
import { gsap } from "gsap";
import { twMerge } from "tailwind-merge";
import type { GSAPReactMarqueeProps } from "../types/gsap-react-marquee.type";
import { normalizeMarqueeOptions } from "./marquee-options";

/**
 * Returns whether every supplied layout measurement is finite and positive.
 * Empty measurement sets are not usable.
 */
export const hasUsableMeasurement = (...measurements: number[]): boolean => {
  return (
    measurements.length > 0 &&
    measurements.every(
      (measurement) => Number.isFinite(measurement) && measurement > 0
    )
  );
};

/**
 * Merges conditional class values and resolves conflicting Tailwind utilities.
 *
 * @param inputs - Values accepted by `clsx`, including arrays and objects.
 * @returns Merged class names with the last Tailwind conflict preserved.
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

/**
 * Finds the first non-transparent computed background from an element upward.
 *
 * @param element - Element where the background search starts.
 * @returns Nearest visible background color, or `transparent`.
 */
export const getEffectiveBackgroundColor = (element: HTMLElement): string => {
  let current: HTMLElement | null = element;

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
 * Applies direction, spacing, and fill-mode styles required by the animation.
 *
 * @param containerElement - Root marquee viewport.
 * @param marqueeElements - Original and cloned marquee wrappers.
 * @param contentElements - Content nodes within the wrappers.
 * @param isVertical - Whether movement uses the Y axis.
 * @param props - Props used to resolve spacing and fill mode.
 */
export const setupContainerStyles = (
  containerElement: HTMLElement,
  marqueeElements: HTMLElement[],
  contentElements: HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): void => {
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

/** Returns whether an element exposes a finite, positive width. */
export const hasDefinedWidth = (element: HTMLElement): boolean => {
  return hasUsableMeasurement(element.offsetWidth);
};

/**
 * Reads the root viewport size on the active animation axis.
 *
 * @param containerElement - Root marquee viewport.
 * @param isVertical - Whether height should be read instead of width.
 */
export const getTargetSize = (
  containerElement: HTMLElement,
  isVertical: boolean
): number => {
  return isVertical
    ? containerElement.offsetHeight
    : containerElement.offsetWidth;
};

/** Width-era alias retained for backward compatibility. */
export const getTargetWidth = getTargetSize;

/** Clone calculation plus information about configured-limit truncation. */
export type DuplicateCountResult = {
  duplicateCount: number;
  limitReached: boolean;
  requiredDuplicateCount: number;
};

/**
 * Calculates additional items needed to cover the measured viewport.
 * The original item is excluded from `duplicateCount`.
 */
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

/** Returns additional clone count without limit metadata. */
export const calculateDuplicateCount = (
  contentSize: number,
  targetSize: number,
  props: GSAPReactMarqueeProps
): number => {
  return calculateDuplicateCountResult(contentSize, targetSize, props)
    .duplicateCount;
};

/** Legacy alias retained for backward compatibility. */
export const calculateDuplicates = calculateDuplicateCount;

/**
 * Resolves wrapper minimum size for normal and fill tracks.
 *
 * @returns CSS minimum size accepted by GSAP.
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

/** Width-era alias retained for backward compatibility. */
export const getMinWidth = getMinSize;
