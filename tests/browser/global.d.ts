import type { GSAPReactMarqueeProps } from "../../src/components/gsap-react-marquee.type";

declare global {
  interface Window {
    __marqueeFixture: {
      render: (
        options?: Omit<GSAPReactMarqueeProps, "children">
      ) => void;
      setContainerSize: (width: number, height: number) => void;
      setContentSize: (width: number, height: number) => void;
      setDisplay: (display: string) => void;
      timelineCount: () => number;
      timelineDurations: () => number[];
      baseTimelineState: () => {
        active: boolean;
        complete: number;
        hasReverseContinuation: boolean;
        paused: boolean;
        progress: number;
        repeat: number;
        repeatValue: number;
        reverseComplete: number;
        reversed: boolean;
        timeScale: number;
        totalProgress: number;
      } | null;
      observeBaseTimeline: () => boolean;
      resourceCounts: () => {
        baseTimelines: number;
        observers: number;
        taggedAnimations: number;
      };
      unmount: () => void;
    };
  }
}

export {};
