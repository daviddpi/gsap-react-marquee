import { clsx, type ClassValue } from "clsx";
import gsap from "gsap";
import { twMerge } from "tailwind-merge";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";

/**
 * Utility function to merge Tailwind classes with clsx
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Sets up container styles and rotation handling
 */
export const setupContainerStyles = (
  containerMarquee: HTMLElement,
  marquees: HTMLElement[],
  marqueesChildren: HTMLElement[],
  isVertical: boolean,
  props: GSAPReactMarqueeProps
) => {
  const { spacing = 16, alignRotationWithY = false } = props;

  gsap.set(containerMarquee, {
    gap: `${spacing}px`,
    rotate: isVertical ? 90 : "0",
  });

  if (isVertical) {
    gsap.set(containerMarquee, { width: window.innerHeight });
  }

  if (alignRotationWithY && marquees.length > 0) {
    const marqueeHeight = marquees[0].offsetHeight;

    gsap.set(containerMarquee, {
      alignItems: "center",
    });

    gsap.set(marqueesChildren, {
      rotate: -90,
      display: "flex",
      flexWrap: "wrap",
      width: marqueeHeight,
      wordBreak: "break-all",
      whiteSpace: "break-spaces",
    });
  }
};

/**
 * Calculates the number of duplicates needed to fill the container
 */
export const calculateDuplicates = (
  marqueeChildrenWidth: number,
  containerMarqueeWidth: number,
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): number => {
  if (!props.fill) return 1;

  const targetWidth = isVertical ? window.innerHeight : containerMarqueeWidth;

  return marqueeChildrenWidth < targetWidth
    ? Math.ceil(targetWidth / marqueeChildrenWidth)
    : 1;
};

/**
 * Determines the minimum width for marquee elements
 */
export const getMinWidth = (
  marqueesChildren: HTMLElement[],
  totalWidth: number,
  containerMarqueeWidth: number,
  props: GSAPReactMarqueeProps
): string | number => {
  const { fill = false, alignRotationWithY = false } = props;

  if (fill) return "auto";
  if (alignRotationWithY && marqueesChildren.length > 0) {
    return `${marqueesChildren[0].offsetHeight}px`;
  }
  if (totalWidth < containerMarqueeWidth) return "100%";
  return `${totalWidth}px`;
};

/**
 * Creates a simple infinite marquee animation
 */
export const simpleAnimation = (
  marquees: HTMLElement[],
  marqueeChildrenDimension: number,
  isReverse: boolean,
  props: GSAPReactMarqueeProps
): void => {
  const { spacing = 16, speed = 100, loop = -1 } = props;

  const tween = gsap.to(marquees, {
    xPercent: (_, el) => {
      const w = parseFloat(String(gsap.getProperty(el, "width", "px")));
      const xPercent = ((w + spacing) / w) * 100;
      return -xPercent;
    },
    duration: (marqueeChildrenDimension - spacing) / speed,
    repeat: loop,
    ease: "none",
  });

  tween.play();

  if (isReverse) {
    tween.totalTime(tween.rawTime() + tween.duration() * 100);
    tween.reverse();
  }
};

/**
 * Creates a complex fill-based marquee animation with seamless looping
 */
export const fillAnimation = (
  marqueesChildren: HTMLElement[],
  startX: number,
  tl: gsap.core.Timeline,
  isReverse: boolean,
  props: GSAPReactMarqueeProps
): void => {
  const { spacing = 16, speed = 100 } = props;

  const widths: number[] = [];
  const xPercents: number[] = [];
  const latestPos = marqueesChildren.length - 1;

  // Set initial positions and calculate percentages
  gsap.set(marqueesChildren, {
    xPercent: (i, el) => {
      const w = (widths[i] = parseFloat(
        String(gsap.getProperty(el, "width", "px"))
      ));
      xPercents[i] =
        (parseFloat(String(gsap.getProperty(el, "x", "px"))) / w) * 100 +
        Number(gsap.getProperty(el, "xPercent"));
      return xPercents[i];
    },
  });

  gsap.set(marqueesChildren, { x: 0 });

  // Calculate the total track length for seamless looping
  const trackLength =
    marqueesChildren[latestPos].offsetLeft +
    (xPercents[latestPos] / 100) * widths[latestPos] -
    startX +
    marqueesChildren[latestPos].offsetWidth +
    spacing;

  // Create animation timeline for each element
  marqueesChildren.forEach((item, i) => {
    const curX = (xPercents[i] / 100) * widths[i];
    const distanceToStart = item.offsetLeft + curX - startX;
    const distanceToLoop = distanceToStart + widths[i];

    tl.to(
      item,
      {
        xPercent: ((curX - distanceToLoop) / widths[i]) * 100,
        duration: distanceToLoop / speed,
      },
      0
    ).fromTo(
      item,
      {
        xPercent: ((curX - distanceToLoop + trackLength) / widths[i]) * 100,
      },
      {
        xPercent: xPercents[i],
        duration: (curX - distanceToLoop + trackLength - curX) / speed,
        immediateRender: false,
      },
      distanceToLoop / speed
    );
  });

  // Pre-render for performance optimization
  tl.progress(1, true).progress(0, true);

  if (isReverse) {
    tl.totalTime(tl.rawTime() + tl.duration() * 100);
    tl.reverse();
  }
};
