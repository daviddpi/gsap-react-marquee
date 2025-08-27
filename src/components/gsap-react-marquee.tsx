import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/all";
import { forwardRef, useMemo, useRef, useState } from "react";
import "./gsap-react-marquee.style.css";

import type { GSAPReactMarqueeProps } from "./gsap-react-marquee.type";
import {
  calculateDuplicates,
  cn,
  coreAnimation,
  getMinWidth,
  setupContainerStyles,
} from "./gsap-reactmarquee.utils";

const GSAPReactMarquee = forwardRef<HTMLDivElement, GSAPReactMarqueeProps>(
  (props, ref) => {
    const {
      children,
      className,
      dir = "left",
      loop = -1,
      paused = false,
      fill = false,
      followScrollDir = false,
      scrollSpeed = 2.5,
    } = props;

    const rootRef = useRef<HTMLDivElement>(null) || ref;
    const containerRef = rootRef;
    const marqueeRef = useRef<HTMLDivElement>(null);
    const [marqueeDuplicates, setMarqueeDuplicates] = useState(1);

    const isVertical = dir === "up" || dir === "down";
    const isReverse = dir === "down" || dir === "right";

    useGSAP(
      () => {
        if (!marqueeRef?.current || !containerRef.current) return;

        const containerMarquee = containerRef?.current;

        const marquees = gsap.utils.toArray<HTMLElement>(
          containerMarquee.querySelectorAll(".gsap-react-marquee")
        );
        const marqueesChildren = gsap.utils.toArray<HTMLElement>(
          containerMarquee.querySelectorAll(
            ".gsap-react-marquee .gsap-react-marquee-content"
          )
        );

        const marquee = marqueeRef.current;

        if (!marquee || !marqueesChildren) return;

        const tl = gsap.timeline({
          paused: paused,
          repeat: loop,
          defaults: { ease: "none" },
          onReverseComplete() {
            // start the animation from the end, when scrolling in reverse (up)
            tl.totalTime(tl.rawTime() + tl.duration() * 100);
          },
        });

        // Setup container and initial styles
        setupContainerStyles(
          containerMarquee,
          marquees,
          marqueesChildren,
          isVertical,
          props
        );

        // Calculate dimensions and duplicates
        const containerMarqueeWidth = containerMarquee.offsetWidth;
        const marqueeChildrenWidth = marqueesChildren[0].offsetWidth;
        const startX = marqueesChildren[0].offsetLeft;

        // Clamp scrollSpeed to valid range (1.1 to 4.0)
        const clampedScrollSpeed = Math.min(4, Math.max(1.1, scrollSpeed));

        setMarqueeDuplicates(
          calculateDuplicates(
            marqueeChildrenWidth,
            containerMarqueeWidth,
            isVertical,
            props
          )
        );

        // Calculate total width and set marquee styles
        const totalWidth = gsap.utils
          .toArray<HTMLElement>(marquee.children)
          .map((child) => child.offsetWidth)
          .reduce((a, b) => a + b, 0);

        gsap.set(marquees, {
          minWidth: getMinWidth(
            marqueesChildren,
            totalWidth,
            containerMarqueeWidth,
            props
          ),
          flex: fill ? "0 0 auto" : "1",
        });

        // Create appropriate animation based on fill setting
        coreAnimation(
          fill ? marqueesChildren : marquees,
          startX,
          tl,
          isReverse,
          props
        );

        /**
         * GSAP Observer for scroll-based speed control
         *
         * This creates an interactive experience where users can control
         * the marquee speed and direction through mouse wheel scrolling.
         *
         * Behavior:
         * - Scroll down: Increases speed in normal direction
         * - Scroll up: Increases speed in reverse direction or slows normal direction
         * - Speed changes are smoothly animated with acceleration and deceleration phases
         * - ScrollSpeed multiplier is applied and clamped to valid range
         */
        Observer.create({
          onChangeY(self) {
            if (!followScrollDir) return;
            let factor = clampedScrollSpeed * (isReverse ? -1 : 1);
            if (self.deltaY < 0) {
              factor *= -1;
            }
            /**
             * Create smooth speed transition animation
             *
             * Phase 1: Quick acceleration to new speed (0.2s)
             * - timeScale: Controls timeline playback speed (higher = faster)
             * - factor * 2.5: Initial speed boost for responsive feel
             * - overwrite: Cancels any previous speed animations
             *
             * Phase 2: Gradual deceleration to sustained speed (1s delay + 1s duration)
             * - factor / 2.5: Settle to a more moderate sustained speed
             * - "+=0.3": Wait 0.3 seconds before starting deceleration
             */
            gsap
              .timeline({
                defaults: {
                  ease: "none",
                },
              })
              .to(tl, {
                timeScale: factor * 2.5,
                duration: 0.2,
                overwrite: true,
              })
              .to(tl, { timeScale: factor / 2.5, duration: 1 }, "+=0.3");
          },
        });
      },
      {
        dependencies: [marqueeDuplicates],
      }
    );

    /**
     * Generate cloned marquee elements for seamless looping
     *
     * Creates multiple copies of the content based on calculated duplicates.
     * Each clone maintains the same structure and styling as the original.
     * Memoized to prevent unnecessary re-renders when dependencies haven't changed.
     */
    const clonedMarquees = useMemo(() => {
      if (!Number.isFinite(marqueeDuplicates) || marqueeDuplicates <= 0)
        return null;

      return Array.from({ length: marqueeDuplicates }, (_, i) => (
        <div key={i} className={cn("gsap-react-marquee")}>
          <div className={cn("gsap-react-marquee-content", className)}>
            {children}
          </div>
        </div>
      ));
    }, [marqueeDuplicates, className, children]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "gsap-react-marquee-container flex w-full overflow-hidden whitespace-nowrap"
        )}
      >
        <div ref={marqueeRef} className={cn("gsap-react-marquee")}>
          <div className={cn("gsap-react-marquee-content", className)}>
            {children}
          </div>
        </div>
        {clonedMarquees}
      </div>
    );
  }
);

GSAPReactMarquee.displayName = "GSAPReactMarquee";

export default GSAPReactMarquee;
