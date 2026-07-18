import type { GSAPReactMarqueeProps } from "../../src/components/types/gsap-react-marquee.type";

declare global {
  interface Window {
    __marqueeFixture: {
      render: (
        options?: Omit<GSAPReactMarqueeProps, "children">
      ) => void;
      setContainerSize: (width: number, height: number) => void;
      setContentSize: (width: number, height: number) => void;
      setContentVariant: (
        variant:
          | "accessibility"
          | "default"
          | "presentational"
          | "vertical-example"
          | "vertical-title"
      ) => void;
      setDisplay: (display: string) => void;
      timelineCount: () => number;
      timelineDurations: () => number[];
      baseTimelineState: () => {
        active: boolean;
        complete: number;
        hasReverseContinuation: boolean;
        identity: number;
        paused: boolean;
        progress: number;
        repeat: number;
        repeatValue: number;
        reverseComplete: number;
        reversed: boolean;
        timeScale: number;
        totalTime: number;
        totalProgress: number;
      } | null;
      observeBaseTimeline: () => boolean;
      resourceCounts: () => {
        baseTimelines: number;
        observers: number;
        taggedAnimations: number;
      };
      marqueeListenerCount: () => number;
      unmount: () => void;
    };
  }
}

export {};
