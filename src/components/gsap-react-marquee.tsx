import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Draggable, InertiaPlugin, Observer } from "gsap/all.js";
import {
  type CSSProperties,
  type MutableRefObject,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./gsap-react-marquee.style.css";
import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";
import {
  calculateDuplicateCount,
  calculateDuplicateCountResult,
  cn,
  createMarqueeAnimation,
  getEffectiveBackgroundColor,
  getMinSize,
  hasUsableMeasurement,
  normalizeMarqueeOptions,
  setupContainerStyles,
} from "./gsap-reactmarquee.utils";
import { useMarqueeMeasurement } from "./use-marquee-measurement";

gsap.registerPlugin(useGSAP, Observer, InertiaPlugin, Draggable);

const warnDuplicateLimit = (
  maxDuplicates: number,
  requiredDuplicateCount: number
) => {
  if (process.env.NODE_ENV === "production") return;

  Reflect.apply(console.warn, console, [
    `GSAPReactMarquee: maxDuplicates=${maxDuplicates} prevents full fill coverage; ${requiredDuplicateCount} duplicates are required.`,
  ]);
};

const GSAPReactMarquee = forwardRef<HTMLDivElement, GSAPReactMarqueeProps>(
  (props, ref) => {
    const {
      children,
      className,
      containerClassName,
      containerStyle,
      dir = "left",
      loop: loopOption,
      paused = false,
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
    const [duplicateCount, setDuplicateCount] = useState(1);
    const [detectedGradientColor, setDetectedGradientColor] = useState<
      string | null
    >(null);
    const hasWarnedDuplicateLimitRef = useRef(false);

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

    useLayoutEffect(() => {
      if (!gradient || !rootRef.current) return;

      const effectiveBackgroundColor = getEffectiveBackgroundColor(
        rootRef.current
      );
      setDetectedGradientColor(effectiveBackgroundColor);
    }, [containerClassName, containerStyle, gradient]);

    const isVertical = dir === "up" || dir === "down";
    const isReverse = dir === "down" || dir === "right";
    const shouldFill = fill;
    const usesContentTrack = fill || isVertical;

    useLayoutEffect(() => {
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
        { children, fill: shouldFill, spacing }
      );
    }, [
      children,
      className,
      containerClassName,
      containerStyle,
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
      className,
      containerClassName,
      containerStyle,
      contentDependency: children,
      duplicateCount,
      isVertical,
      rootRef,
    });

    useLayoutEffect(() => {
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
      spacing,
    ]);

    useGSAP(
      (_, contextSafe) => {
        if (!marqueeRef.current || !rootRef.current || !contextSafe) return;

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
          children,
          fill: shouldFill,
          maxDuplicates,
          spacing,
          speed,
          delay,
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
        let scrollObserver: Observer | null = null;

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

        const totalTrackSize = marqueeElements
          .map((element) =>
            isVertical ? element.offsetHeight : element.offsetWidth
          )
          .reduce((a, b) => a + b, 0);

        if (!hasUsableMeasurement(totalTrackSize)) return;

        /**
         * Horizontal normal mode stretches undersized content across the
         * viewport. Fill mode and all vertical marquees use auto sizing because
         * the repeated content defines the track.
         */
        const minSizeValue = usesContentTrack
          ? "auto"
          : getMinSize(totalTrackSize / 2, containerSize, animationProps);

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
          paused,
          repeat: loop,
          defaults: { ease: "none" },
          onReverseComplete() {
            timeline.totalTime(timeline.rawTime() + timeline.duration() * 100);
          },
        });

        const cleanupMarqueeAnimation = createMarqueeAnimation(
          animatedElements,
          startPosition,
          timeline,
          isReverse,
          marqueeElements,
          isVertical,
          animationProps,
          containerElement
        );

        if (!hasUsableMeasurement(timeline.duration())) {
          cleanupMarqueeAnimation?.();
          timeline.kill();
          return;
        }

        if (scrollFollow) {
          scrollObserver = Observer.create({
            onChangeY(self) {
              /**
               * Wheel movement temporarily changes timeline speed and direction.
               * The first tween gives an immediate response; the second eases
               * back to a steadier speed so scrolling does not feel abrupt.
               */
              let factor = scrollSpeed * (isReverse ? -1 : 1);
              if (self.deltaY < 0) {
                factor *= -1;
              }

              gsap
                .timeline({
                  defaults: {
                    ease: "none",
                  },
                })
                .to(timeline, {
                  timeScale: factor * scrollSpeed,
                  duration: 0.2,
                  overwrite: true,
                })
                .to(
                  timeline,
                  {
                    timeScale: factor / scrollSpeed,
                    duration: 1,
                  },
                  "+=0.3"
                );
            },
          });
        }

        const onMouseEnter = contextSafe(() => {
          timeline.pause();
        });
        const onMouseLeave = contextSafe(() => {
          if (isReverse) {
            timeline.reverse();
          } else {
            timeline.play();
          }
        });

        if (pauseOnHover) {
          containerElement.addEventListener("mouseenter", onMouseEnter);
          containerElement.addEventListener("mouseleave", onMouseLeave);
        }

        return () => {
          containerElement.removeEventListener("mouseenter", onMouseEnter);
          containerElement.removeEventListener("mouseleave", onMouseLeave);
          gsap.killTweensOf(timeline);
          timeline.kill();
          scrollObserver?.kill();
          cleanupMarqueeAnimation?.();
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
          className,
          children,
          measurementVersion,
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
      if (!Number.isFinite(duplicateCount) || duplicateCount <= 0) return null;

      return Array.from({ length: duplicateCount }, (_, i) => (
        <div key={i} className={cn("gsap-react-marquee")}>
          <div className={cn("gsap-react-marquee-content", className)}>
            {children}
          </div>
        </div>
      ));
    }, [duplicateCount, className, children]);

    return (
      <div
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
        className={cn(
          "gsap-react-marquee-container",
          { "gsap-react-marquee-vertical": isVertical },
          containerClassName
        )}
      >
        <div ref={marqueeRef} className={cn("gsap-react-marquee")}>
          <div className={cn("gsap-react-marquee-content", className)}>
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
