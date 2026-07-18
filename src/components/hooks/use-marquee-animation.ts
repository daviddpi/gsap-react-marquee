import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { RefObject } from "react";
import type { GSAPReactMarqueeProps } from "../types/gsap-react-marquee.type";
import {
  createMarqueeAnimation,
  resumeTimeline,
} from "../utils/marquee-animation";
import {
  calculateDuplicateCount,
  getMinSize,
  hasUsableMeasurement,
} from "../utils/marquee-layout";
import { setupMarqueeScrollFollow } from "../utils/marquee-scroll-follow";
import type { useMarqueeMeasurement } from "./use-marquee-measurement";
import type { useMarqueePlugins } from "./use-marquee-plugins";

type MeasurementState = Pick<
  ReturnType<typeof useMarqueeMeasurement>,
  | "cloneApplicationSnapshotRef"
  | "measurementSnapshotRef"
  | "measurementVersion"
>;

type PluginState = Pick<
  ReturnType<typeof useMarqueePlugins>,
  "pluginsReady" | "pluginsRef"
>;

type UseMarqueeAnimationOptions = MeasurementState &
  PluginState & {
    delay: number;
    dir: NonNullable<GSAPReactMarqueeProps["dir"]>;
    draggable: boolean;
    duplicateCount: number;
    fill: boolean;
    loop: number;
    marqueeRef: RefObject<HTMLDivElement | null>;
    maxDuplicates: number;
    paused: boolean;
    pausedRef: RefObject<boolean>;
    pauseOnHover: boolean;
    rootRef: RefObject<HTMLDivElement | null>;
    scrollFollow: boolean;
    scrollSpeed: number;
    shouldReduceMotion: boolean;
    spacing: number;
    speed: number;
  };

/**
 * Owns GSAP timeline construction and interaction cleanup for one marquee.
 * Rebuilds only from animation, measurement, or plugin dependencies.
 */
export const useMarqueeAnimation = ({
  cloneApplicationSnapshotRef,
  delay,
  dir,
  draggable,
  duplicateCount,
  fill,
  loop,
  marqueeRef,
  maxDuplicates,
  measurementSnapshotRef,
  measurementVersion,
  paused,
  pausedRef,
  pauseOnHover,
  pluginsReady,
  pluginsRef,
  rootRef,
  scrollFollow,
  scrollSpeed,
  shouldReduceMotion,
  spacing,
  speed,
}: UseMarqueeAnimationOptions): void => {
  const isVertical = dir === "up" || dir === "down";
  const isReverse = dir === "down" || dir === "right";

  useGSAP(
    (_, contextSafe) => {
      if (
        shouldReduceMotion ||
        !marqueeRef.current ||
        !rootRef.current ||
        !pluginsReady ||
        !contextSafe
      ) {
        return;
      }

      const containerElement = rootRef.current;
      const measurementSnapshot =
        cloneApplicationSnapshotRef.current ??
        measurementSnapshotRef.current;
      const expectedAxis = isVertical ? "vertical" : "horizontal";

      if (
        !measurementSnapshot ||
        measurementSnapshot.axis !== expectedAxis
      ) {
        return;
      }

      const animationProps = {
        children: null,
        fill,
        maxDuplicates,
        spacing,
        speed,
        delay,
        loop,
        paused,
        draggable,
      } satisfies GSAPReactMarqueeProps;

      const marqueeElements = gsap.utils.toArray<HTMLElement>(
        containerElement.querySelectorAll(".gsap-react-marquee")
      );
      const contentElements = gsap.utils.toArray<HTMLElement>(
        containerElement.querySelectorAll(
          ".gsap-react-marquee .gsap-react-marquee-content"
        )
      );

      if (!contentElements.length) return;

      const containerSize = measurementSnapshot.rootSize;
      const contentSize = measurementSnapshot.contentSize;
      const targetSize = measurementSnapshot.viewportSize;
      const startPosition = isVertical
        ? contentElements[0].offsetTop
        : contentElements[0].offsetLeft;
      let isPointerInside = false;
      let isFocusInside = false;

      const shouldRemainPaused = () =>
        pausedRef.current ||
        (pauseOnHover && (isPointerInside || isFocusInside));

      if (
        !hasUsableMeasurement(containerSize, contentSize, targetSize) ||
        !Number.isFinite(startPosition)
      ) {
        return;
      }

      const nextDuplicateCount = calculateDuplicateCount(
        contentSize,
        targetSize,
        animationProps
      );
      if (duplicateCount !== nextDuplicateCount) return;

      const minSizeValue = fill
        ? "auto"
        : getMinSize(contentSize, containerSize, animationProps);

      gsap.set(marqueeElements, {
        [isVertical ? "minHeight" : "minWidth"]: minSizeValue,
        flex: fill ? "0 0 auto" : "1",
      });

      const animatedElements = fill ? contentElements : marqueeElements;
      const animatedElementSizes = animatedElements.map((element) =>
        isVertical ? element.offsetHeight : element.offsetWidth
      );

      if (!hasUsableMeasurement(...animatedElementSizes)) return;

      const timeline = gsap.timeline({
        paused: true,
        repeat: loop,
        defaults: { ease: "none" },
        data: "gsap-react-marquee-base",
      });

      const cleanupMarqueeAnimation = createMarqueeAnimation(
        animatedElements,
        startPosition,
        timeline,
        isReverse,
        marqueeElements,
        isVertical,
        animationProps,
        containerElement,
        shouldRemainPaused,
        pluginsRef.current.draggable ?? undefined
      );

      if (!hasUsableMeasurement(timeline.duration())) {
        cleanupMarqueeAnimation?.();
        timeline.kill();
        return;
      }

      const restoreBaseTimeline = () => {
        resumeTimeline({
          timeline,
          isReverse,
          paused: shouldRemainPaused(),
        });
      };
      const scrollFollowController = setupMarqueeScrollFollow({
        enabled: scrollFollow,
        isReverse,
        observer: pluginsRef.current.observer,
        restoreBaseTimeline,
        scrollSpeed,
        shouldRemainPaused,
        timeline,
      });

      const onPointerEnter = contextSafe(() => {
        isPointerInside = true;
        scrollFollowController.stop();
        timeline.pause();
      });
      const onPointerLeave = contextSafe(() => {
        isPointerInside = false;
        restoreBaseTimeline();
      });
      const onFocusIn = contextSafe(() => {
        isFocusInside = true;
        scrollFollowController.stop();
        timeline.pause();
      });
      const onFocusOut = contextSafe((event: FocusEvent) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          containerElement.contains(nextTarget)
        ) {
          return;
        }

        isFocusInside = false;
        restoreBaseTimeline();
      });

      if (pauseOnHover) {
        containerElement.addEventListener("pointerenter", onPointerEnter);
        containerElement.addEventListener("pointerleave", onPointerLeave);
        containerElement.addEventListener("focusin", onFocusIn);
        containerElement.addEventListener("focusout", onFocusOut);
      }

      return () => {
        containerElement.removeEventListener("pointerenter", onPointerEnter);
        containerElement.removeEventListener("pointerleave", onPointerLeave);
        containerElement.removeEventListener("focusin", onFocusIn);
        containerElement.removeEventListener("focusout", onFocusOut);
        scrollFollowController.cleanup();
        cleanupMarqueeAnimation?.();
        gsap.killTweensOf(timeline);
        timeline.kill();
      };
    },
    {
      dependencies: [
        duplicateCount,
        dir,
        loop,
        paused,
        delay,
        fill,
        maxDuplicates,
        scrollFollow,
        scrollSpeed,
        pauseOnHover,
        spacing,
        speed,
        draggable,
        pluginsReady,
        measurementVersion,
        shouldReduceMotion,
      ],
      revertOnUpdate: true,
    }
  );
};
