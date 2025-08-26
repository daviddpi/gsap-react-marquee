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
    const parent = containerMarquee.parentNode as HTMLElement;
    gsap.set(containerMarquee, {
      width: parent.offsetHeight,
    });
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
 * Creates a complex fill-based marquee animation with seamless looping
 */
export const coreAnimation = (
  elementsToAnimate: HTMLElement[],
  startX: number,
  tl: gsap.core.Timeline,
  isReverse: boolean,
  isVertical: boolean,
  props: GSAPReactMarqueeProps
): void => {
  const { spacing = 16, speed = 100, delay = 0, paused = false } = props;

  const widths: number[] = [];
  const xPercents: number[] = [];
  const latestPos = elementsToAnimate.length - 1;

  // Set initial positions and calculate percentages
  gsap.set(elementsToAnimate, {
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

  gsap.set(elementsToAnimate, { x: 0 });

  // Calculate the total track length for seamless looping
  const trackLength =
    elementsToAnimate[latestPos].offsetLeft +
    (xPercents[latestPos] / 100) * widths[latestPos] -
    startX +
    elementsToAnimate[latestPos].offsetWidth +
    spacing;

  // Create animation timeline for each element
  elementsToAnimate.forEach((item, i) => {
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

  tl.delay(delay);

  if (isReverse) {
    if (paused) tl.pause();

    tl.progress(1).pause();

    gsap.delayedCall(delay, () => {
      tl.reverse();

      tl.eventCallback("onReverseComplete", () => {
        tl.totalTime(tl.rawTime() + tl.duration() * 100);
      });
    });
  }
};
