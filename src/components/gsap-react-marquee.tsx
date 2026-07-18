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
import "./styles/gsap-react-marquee.style.css";
import type { GSAPReactMarqueeProps } from "./types/gsap-react-marquee.type";
import {
  hasUnsupportedMarqueeContent,
  installMarqueeCloneFocusGuard,
  sanitizeMarqueeClones,
  supportsNativeInert,
} from "./utils/marquee-accessibility";
import {
  calculateDuplicateCountResult,
  getEffectiveBackgroundColor,
  setupContainerStyles,
} from "./utils/marquee-layout";
import { normalizeMarqueeOptions } from "./utils/marquee-options";
import { isProductionRuntime } from "./utils/runtime-diagnostics";
import { useIsomorphicLayoutEffect } from "./hooks/use-isomorphic-layout-effect";
import { useMarqueeAnimation } from "./hooks/use-marquee-animation";
import { useMarqueeMeasurement } from "./hooks/use-marquee-measurement";
import { useMarqueePlugins } from "./hooks/use-marquee-plugins";
import { usePrefersReducedMotion } from "./hooks/use-prefers-reduced-motion";

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
    const shouldReduceMotion = respectReducedMotion && prefersReducedMotion;
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
     * Background-only style changes do not trigger ResizeObserver, so style
     * identity remains an intentional dependency for gradient detection.
     */
    useIsomorphicLayoutEffect(() => {
      if (!gradient || !rootRef.current) return;

      const effectiveBackgroundColor = getEffectiveBackgroundColor(
        rootRef.current
      );
      setDetectedGradientColor(effectiveBackgroundColor);
    }, [containerClassName, containerStyle, gradient]);

    /**
     * Child identity is intentional: same-size replacements skip animation
     * rebuilds but still need validation and clone sanitization after commit.
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
        { children: null, fill, spacing }
      );
    }, [duplicateCount, fill, isVertical, spacing]);

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
          fill,
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
      fill,
      isVertical,
      maxDuplicates,
      measurementSnapshotRef,
      measurementVersion,
      shouldReduceMotion,
      spacing,
    ]);

    useMarqueeAnimation({
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
    });

    const gradientColorValue =
      gradientColor ??
      (gradient ? detectedGradientColor : null) ??
      "transparent";

    const clonedItems = useMemo(() => {
      if (
        shouldReduceMotion ||
        !Number.isFinite(duplicateCount) ||
        duplicateCount <= 0
      ) {
        return null;
      }

      return Array.from({ length: duplicateCount }, (_, index) => (
        <div
          key={index}
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
