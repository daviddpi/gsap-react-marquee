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
    };
  }
}

export {};
