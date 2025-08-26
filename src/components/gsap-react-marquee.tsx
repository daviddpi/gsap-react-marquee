import { useGSAP } from "@gsap/react";
import gsap from "gsap";
// import { Observer } from "gsap/all";
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
        //   const marqueeHeight = marquees[0].offsetHeight;
        const marqueeChildrenWidth = marqueesChildren[0].offsetWidth;
        const startX = marqueesChildren[0].offsetLeft;

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
          isVertical,
          props
        );
      },
      { dependencies: [marqueeDuplicates] }
    );

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
