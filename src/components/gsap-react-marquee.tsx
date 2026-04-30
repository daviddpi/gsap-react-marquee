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
  cn,
  createMarqueeAnimation,
  getEffectiveBackgroundColor,
  getTargetSize,
  getMinSize,
  setupContainerStyles,
} from "./gsap-reactmarquee.utils";

gsap.registerPlugin(useGSAP, Observer, InertiaPlugin, Draggable);

const GSAPReactMarquee = forwardRef<HTMLDivElement, GSAPReactMarqueeProps>(
  (props, ref) => {
    const {
      children,
      className,
      dir = "left",
      loop = -1,
      paused = false,
      delay = 0,
      fill = false,
      scrollFollow = false,
      scrollSpeed = 2.5,
      gradient = false,
      gradientColor = null,
      pauseOnHover = false,
      spacing = 16,
      speed = 100,
      draggable = false,
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const marqueeRef = useRef<HTMLDivElement | null>(null);
    const [duplicateCount, setDuplicateCount] = useState(1);
    const [detectedGradientColor, setDetectedGradientColor] = useState<
      string | null
    >(null);
    const [measurementVersion, setMeasurementVersion] = useState(0);

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
    }, [gradient]);

    const isVertical = dir === "up" || dir === "down";
    const isReverse = dir === "down" || dir === "right";

    /**
     * Re-measure when layout can change after the first render
     *
     * Images and responsive content often report a different size after mount.
     * ResizeObserver catches container/content changes, while image load/error
     * events catch late media changes that should restart the GSAP timeline.
     */
    useLayoutEffect(() => {
      const container = rootRef.current;
      if (!container) return;

      const firstContentElement = container.querySelector(
        ".gsap-react-marquee .gsap-react-marquee-content"
      ) as HTMLElement | null;

      let animationFrameId: number | null = null;
      const scheduleMeasurement = () => {
        if (animationFrameId != null) return;
        animationFrameId = requestAnimationFrame(() => {
          setMeasurementVersion((version) => version + 1);
          animationFrameId = null;
        });
      };

      const resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(scheduleMeasurement)
          : null;
      if (resizeObserver) {
        resizeObserver.observe(container);
        if (firstContentElement) resizeObserver.observe(firstContentElement);
      }

      const pendingImages = Array.from(container.querySelectorAll("img"));
      const handleImageSettled = () => scheduleMeasurement();
      pendingImages.forEach((image) => {
        if (image.complete) return;
        image.addEventListener("load", handleImageSettled);
        image.addEventListener("error", handleImageSettled);
      });

      return () => {
        resizeObserver?.disconnect();
        pendingImages.forEach((image) => {
          image.removeEventListener("load", handleImageSettled);
          image.removeEventListener("error", handleImageSettled);
        });
        if (animationFrameId != null) cancelAnimationFrame(animationFrameId);
      };
    }, [children, className]);

    useGSAP(
      (_, contextSafe) => {
        if (!marqueeRef.current || !rootRef.current || !contextSafe) return;

        const containerElement = rootRef.current;

        /**
         * Pass only animation-related props to helpers.
         * This keeps utility calls explicit and avoids reading props.draggable
         * or other nested values from inside lower-level functions.
         */
        const animationProps = {
          children,
          fill,
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

        setupContainerStyles(
          containerElement,
          marqueeElements,
          contentElements,
          isVertical,
          animationProps
        );

        const containerSize = isVertical
          ? containerElement.offsetHeight
          : containerElement.offsetWidth;
        const contentSize = isVertical
          ? contentElements[0].offsetHeight
          : contentElements[0].offsetWidth;
        const targetSize = getTargetSize(containerElement, isVertical);
        const startPosition = isVertical
          ? contentElements[0].offsetTop
          : contentElements[0].offsetLeft;
        let scrollObserver: Observer | null = null;

        const clampedScrollSpeed = Math.min(4, Math.max(1.1, scrollSpeed));

        /**
         * Duplicate count affects rendered DOM. When the measured count changes,
         * update state and let React render the correct number of cloned items
         * before creating the GSAP timeline.
         */
        const nextDuplicateCount = calculateDuplicateCount(
          contentSize,
          targetSize,
          animationProps
        );
        if (duplicateCount !== nextDuplicateCount) {
          setDuplicateCount(nextDuplicateCount);
          return;
        }

        /**
         * Timeline owns the continuous marquee movement. Reverse directions start
         * from the end of the timeline so right/down movement loops correctly.
         */
        const timeline = gsap.timeline({
          paused,
          repeat: loop,
          defaults: { ease: "none" },
          onReverseComplete() {
            timeline.totalTime(timeline.rawTime() + timeline.duration() * 100);
          },
        });

        const totalTrackSize = marqueeElements
          .map((element) =>
            isVertical ? element.offsetHeight : element.offsetWidth
          )
          .reduce((a, b) => a + b, 0);

        /**
         * In normal mode there is one original item and one clone, so half the
         * track represents one logical item. Fill mode uses auto sizing because
         * the cloned content itself defines the track.
         */
        const minSizeValue = getMinSize(
          fill ? 0 : totalTrackSize / 2,
          containerSize,
          animationProps
        );

        gsap.set(marqueeElements, {
          [isVertical ? "minHeight" : "minWidth"]: minSizeValue,
          flex: fill ? "0 0 auto" : "1",
        });

        const cleanupMarqueeAnimation = createMarqueeAnimation(
          fill ? contentElements : marqueeElements,
          startPosition,
          timeline,
          isReverse,
          marqueeElements,
          isVertical,
          animationProps
        );

        if (scrollFollow) {
          scrollObserver = Observer.create({
            onChangeY(self) {
              /**
               * Wheel movement temporarily changes timeline speed and direction.
               * The first tween gives an immediate response; the second eases
               * back to a steadier speed so scrolling does not feel abrupt.
               */
              let factor = clampedScrollSpeed * (isReverse ? -1 : 1);
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
                  timeScale: factor * clampedScrollSpeed,
                  duration: 0.2,
                  overwrite: true,
                })
                .to(
                  timeline,
                  {
                    timeScale: factor / clampedScrollSpeed,
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
            "--gradient-color": gradientColorValue,
          } as CSSProperties
        }
        className={cn("gsap-react-marquee-container", {
          "gsap-react-marquee-vertical": isVertical,
        })}
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
