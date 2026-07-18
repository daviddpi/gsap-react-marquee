import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  type CSSProperties,
  type MutableRefObject,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import "./gsap-react-marquee.style.css";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";
import {
  hasUnsupportedMarqueeContent,
  installMarqueeCloneFocusGuard,
  sanitizeMarqueeClones,
  supportsNativeInert,
} from "./marquee-accessibility";
import {
  calculateDuplicateCount,
  calculateDuplicateCountResult,
  createMarqueeAnimation,
  getEffectiveBackgroundColor,
  getMinSize,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  resumeTimeline,
  setupContainerStyles,
} from "./gsap-reactmarquee.utils";
import { useMarqueeMeasurement } from "./use-marquee-measurement";
import { useMarqueePlugins } from "./use-marquee-plugins";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { isProductionRuntime } from "./runtime-diagnostics";

gsap.registerPlugin(useGSAP);

const joinClassNames = (
  ...classNames: Array<string | false | null | undefined>
): string => classNames.filter(Boolean).join(" ");

const warnDuplicateLimit = (
  maxDuplicates: number,
  requiredDuplicateCount: number
) => {
  if (isProductionRuntime()) return;

  Reflect.apply(console.warn, console, [
    `GSAPReactMarquee: maxDuplicates=${maxDuplicates} prevents full fill coverage; ${requiredDuplicateCount} duplicates are required.`,
  ]);
};

const warnUnsupportedContent = () => {
  if (isProductionRuntime()) return;

  Reflect.apply(console.warn, console, [
    "GSAPReactMarquee: 0.4.0 supports presentational children only. Interactive children and stable IDs are unsupported; visual clones are sanitized for safety.",
  ]);
};

const GSAPReactMarquee = forwardRef<HTMLDivElement, GSAPReactMarqueeProps>(
  (props, ref) => {
    const {
      children,
      className,
      containerClassName,
      containerStyle,
      containerProps,
      dir = "left",
      loop: loopOption,
      paused = false,
      respectReducedMotion = true,
      delay: delayOption,
      fill = false,
      maxDuplicates: maxDuplicatesOption,
      scrollFollow = false,
      scrollSpeed: scrollSpeedOption,
      gradient = false,
      gradientColor = null,
      pauseOnHover = false,
      spacing: spacingOption,
      speed: speedOption,
      draggable = false,
    } = props;

    const { delay, loop, maxDuplicates, scrollSpeed, spacing, speed } =
      normalizeMarqueeOptions({
        delay: delayOption,
        loop: loopOption,
        maxDuplicates: maxDuplicatesOption,
        scrollSpeed: scrollSpeedOption,
        spacing: spacingOption,
        speed: speedOption,
      });

    const rootRef = useRef<HTMLDivElement | null>(null);
    const marqueeRef = useRef<HTMLDivElement | null>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const shouldReduceMotion =
      respectReducedMotion && prefersReducedMotion;
    const { pluginsReady, pluginsRef } = useMarqueePlugins({
      draggable: draggable && !shouldReduceMotion,
      scrollFollow: scrollFollow && !shouldReduceMotion,
    });
    const pausedRef = useRef(paused);
    pausedRef.current = paused;
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [detectedGradientColor, setDetectedGradientColor] = useState<
      string | null
    >(null);
    const hasWarnedDuplicateLimitRef = useRef(false);
    const hasWarnedUnsupportedContentRef = useRef(false);

    const setContainerRef = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;

        if (typeof ref === "function") {
          ref(node);
          return;
        }

        if (ref) {
          (ref as MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    /**
     * containerStyle is intentionally observed by identity: background-only
     * style changes do not trigger ResizeObserver but must refresh the fade.
     */
    useIsomorphicLayoutEffect(() => {
      if (!gradient || !rootRef.current) return;

      const effectiveBackgroundColor = getEffectiveBackgroundColor(
        rootRef.current
      );
      setDetectedGradientColor(effectiveBackgroundColor);
    }, [containerClassName, containerStyle, gradient]);

    /**
     * Child identity is intentional in these accessibility effects. Same-size
     * DOM replacements do not rebuild animation, but still require validation
     * and clone sanitization after React commits the new descendants.
     */
    useIsomorphicLayoutEffect(() => {
      if (
        hasWarnedUnsupportedContentRef.current ||
        !marqueeRef.current ||
        !hasUnsupportedMarqueeContent(marqueeRef.current)
      ) {
        return;
      }

      hasWarnedUnsupportedContentRef.current = true;
      warnUnsupportedContent();
    }, [children]);

    useIsomorphicLayoutEffect(() => {
      const container = rootRef.current;
      if (!container) return;

      const nativeInert = supportsNativeInert();
      sanitizeMarqueeClones(container, nativeInert);
      return installMarqueeCloneFocusGuard(container, nativeInert);
    }, [children, duplicateCount, shouldReduceMotion]);

    const isVertical = dir === "up" || dir === "down";
    const isReverse = dir === "down" || dir === "right";
    const shouldFill = fill;
    const usesContentTrack = fill;

    useIsomorphicLayoutEffect(() => {
      const container = rootRef.current;
      if (!container) return;

      const marqueeElements = Array.from(
        container.querySelectorAll<HTMLElement>(".gsap-react-marquee")
      );
      const contentElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          ".gsap-react-marquee .gsap-react-marquee-content"
        )
      );

      setupContainerStyles(
        container,
        marqueeElements,
        contentElements,
        isVertical,
        { children: null, fill: shouldFill, spacing }
      );
    }, [
      duplicateCount,
      isVertical,
      shouldFill,
      spacing,
    ]);

    const {
      beginCloneApplication,
      cloneApplicationSnapshotRef,
      measurementSnapshotRef,
      measurementVersion,
    } = useMarqueeMeasurement({
      duplicateCount,
      isVertical,
      rootRef,
    });

    useIsomorphicLayoutEffect(() => {
      if (shouldReduceMotion) {
        setDuplicateCount((currentCount) =>
          currentCount === 0 ? currentCount : 0
        );
        return;
      }

      const snapshot = measurementSnapshotRef.current;
      const expectedAxis = isVertical ? "vertical" : "horizontal";
      if (!snapshot || snapshot.axis !== expectedAxis) return;

      const duplicateResult = calculateDuplicateCountResult(
        snapshot.contentSize,
        snapshot.viewportSize,
        {
          children: null,
          fill: shouldFill,
          maxDuplicates,
          spacing,
        }
      );
      const { duplicateCount: nextDuplicateCount } = duplicateResult;

      if (
        duplicateResult.limitReached &&
        !hasWarnedDuplicateLimitRef.current
      ) {
        hasWarnedDuplicateLimitRef.current = true;
        warnDuplicateLimit(
          maxDuplicates,
          duplicateResult.requiredDuplicateCount
        );
      }

      if (duplicateCount === nextDuplicateCount) return;

      if (!beginCloneApplication(snapshot)) return;
      setDuplicateCount(nextDuplicateCount);
    }, [
      beginCloneApplication,
      duplicateCount,
      isVertical,
      maxDuplicates,
      measurementSnapshotRef,
      measurementVersion,
      shouldFill,
      shouldReduceMotion,
      spacing,
    ]);

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

        /**
         * Pass only animation-related props to helpers.
         * This keeps utility calls explicit and avoids reading props.draggable
         * or other nested values from inside lower-level functions.
         */
        const animationProps = {
          children: null,
          fill: shouldFill,
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
        let scrollObserver: { kill: () => void } | null = null;
        let scrollResponseTimeline: ReturnType<typeof gsap.timeline> | null =
          null;
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

        /**
         * Clone state is applied by the dedicated layout effect. Timeline
         * construction waits until the rendered count matches the same snapshot.
         */
        const nextDuplicateCount = calculateDuplicateCount(
          contentSize,
          targetSize,
          {
            ...animationProps,
            fill: shouldFill,
          }
        );
        if (duplicateCount !== nextDuplicateCount) {
          return;
        }

        /**
         * Normal mode stretches undersized wrappers across the active viewport
         * axis. Fill mode uses auto-sized content because its measured repeats
         * define the track.
         */
        const minSizeValue = usesContentTrack
          ? "auto"
          : getMinSize(contentSize, containerSize, animationProps);

        gsap.set(marqueeElements, {
          [isVertical ? "minHeight" : "minWidth"]: minSizeValue,
          flex: usesContentTrack ? "0 0 auto" : "1",
        });

        const animatedElements = usesContentTrack
          ? contentElements
          : marqueeElements;
        const animatedElementSizes = animatedElements.map((element) =>
          isVertical ? element.offsetHeight : element.offsetWidth
        );

        if (!hasUsableMeasurement(...animatedElementSizes)) return;

        /**
         * Timeline owns the continuous marquee movement. It is created only
         * after every required measurement has become finite and positive.
         */
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

        const stopScrollResponse = () => {
          scrollResponseTimeline?.kill();
          scrollResponseTimeline = null;
          gsap.killTweensOf(timeline);
        };

        const restoreBaseTimeline = () => {
          resumeTimeline({
            timeline,
            isReverse,
            paused: shouldRemainPaused(),
          });
        };

        if (scrollFollow) {
          const Observer = pluginsRef.current.observer;
          scrollObserver =
            Observer?.create({
              onChangeY(self) {
                stopScrollResponse();

                if (shouldRemainPaused()) {
                  restoreBaseTimeline();
                  return;
                }

                /**
                 * Preserve the legacy response curve: scrollSpeed is an input
                 * strength whose square sets the temporary timeScale. Wheel
                 * direction may invert motion; completion always restores the
                 * configured direction at timeScale 1.
                 */
                const baseTimeScale = isReverse ? -1 : 1;
                const wheelDirection = self.deltaY < 0 ? -1 : 1;
                const responseTimeScale =
                  baseTimeScale * wheelDirection * scrollSpeed * scrollSpeed;

                scrollResponseTimeline = gsap
                  .timeline({
                    data: "gsap-react-marquee-scroll-response",
                    defaults: {
                      ease: "none",
                    },
                    onComplete() {
                      scrollResponseTimeline = null;
                      restoreBaseTimeline();
                    },
                  })
                  .to(timeline, {
                    timeScale: responseTimeScale,
                    duration: 0.2,
                    overwrite: true,
                  })
                  .to(
                    timeline,
                    {
                      timeScale: baseTimeScale,
                      duration: 1,
                    },
                    "+=0.3"
                  );
              },
            }) ?? null;
        }

        const onPointerEnter = contextSafe(() => {
          isPointerInside = true;
          stopScrollResponse();
          timeline.pause();
        });
        const onPointerLeave = contextSafe(() => {
          isPointerInside = false;
          restoreBaseTimeline();
        });
        const onFocusIn = contextSafe(() => {
          isFocusInside = true;
          stopScrollResponse();
          timeline.pause();
        });
        const onFocusOut = contextSafe((event: FocusEvent) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && containerElement.contains(nextTarget)) {
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
          scrollObserver?.kill();
          stopScrollResponse();
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

    /**
     * Gradient color priority:
     * 1. Explicit gradientColor prop.
     * 2. Auto-detected nearest background color.
     * 3. Transparent fallback when gradients are disabled or undetected.
     */
    const gradientColorValue =
      gradientColor ??
      (gradient ? detectedGradientColor : null) ??
      "transparent";

    /**
     * Render cloned marquee items after measurement.
     * The original item is always rendered above; duplicateCount controls only
     * the additional copies needed for the current container/content size.
     */
    const clonedItems = useMemo(() => {
      if (
        shouldReduceMotion ||
        !Number.isFinite(duplicateCount) ||
        duplicateCount <= 0
      ) {
        return null;
      }

      return Array.from({ length: duplicateCount }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={joinClassNames(
            "gsap-react-marquee",
            "gsap-react-marquee-clone"
          )}
          data-gsap-react-marquee-clone=""
        >
          <div
            className={joinClassNames(
              "gsap-react-marquee-content",
              className
            )}
          >
            {children}
          </div>
        </div>
      ));
    }, [duplicateCount, className, children, shouldReduceMotion]);

    return (
      <div
        {...containerProps}
        ref={setContainerRef}
        style={
          {
            ...containerStyle,
            display: "flex",
            overflow: "hidden",
            position: "relative",
            whiteSpace: "nowrap",
            "--gradient-color": gradientColorValue,
          } as CSSProperties
        }
        className={joinClassNames(
          "gsap-react-marquee-container",
          isVertical && "gsap-react-marquee-vertical",
          containerClassName
        )}
      >
        <div
          ref={marqueeRef}
          className="gsap-react-marquee"
          data-gsap-react-marquee-original=""
        >
          <div
            className={joinClassNames(
              "gsap-react-marquee-content",
              className
            )}
          >
            {children}
          </div>
        </div>
        {clonedItems}
      </div>
    );
  }
);

GSAPReactMarquee.displayName = "GSAPReactMarquee";

export default GSAPReactMarquee;
