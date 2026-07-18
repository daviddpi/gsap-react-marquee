import { gsap } from "gsap";
import type { ObserverPlugin } from "./marquee-plugins";

type GSAPTimeline = ReturnType<typeof gsap.timeline>;

type SetupMarqueeScrollFollowOptions = {
  enabled: boolean;
  isReverse: boolean;
  observer: ObserverPlugin | null;
  restoreBaseTimeline: () => void;
  scrollSpeed: number;
  shouldRemainPaused: () => boolean;
  timeline: GSAPTimeline;
};

/** Lifecycle controls returned by scroll-follow setup. */
export type MarqueeScrollFollowController = {
  cleanup: () => void;
  stop: () => void;
};

/**
 * Temporarily maps vertical wheel direction and strength to timeline speed.
 * Completion restores the marquee's configured direction and speed.
 */
export const setupMarqueeScrollFollow = ({
  enabled,
  isReverse,
  observer: Observer,
  restoreBaseTimeline,
  scrollSpeed,
  shouldRemainPaused,
  timeline,
}: SetupMarqueeScrollFollowOptions): MarqueeScrollFollowController => {
  let scrollResponseTimeline: GSAPTimeline | null = null;

  const stop = () => {
    scrollResponseTimeline?.kill();
    scrollResponseTimeline = null;
    gsap.killTweensOf(timeline);
  };

  const scrollObserver = enabled
    ? (Observer?.create({
        onChangeY(self) {
          stop();

          if (shouldRemainPaused()) {
            restoreBaseTimeline();
            return;
          }

          const baseTimeScale = isReverse ? -1 : 1;
          const wheelDirection = self.deltaY < 0 ? -1 : 1;
          const responseTimeScale =
            baseTimeScale * wheelDirection * scrollSpeed * scrollSpeed;

          scrollResponseTimeline = gsap
            .timeline({
              data: "gsap-react-marquee-scroll-response",
              defaults: { ease: "none" },
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
      }) ?? null)
    : null;

  return {
    stop,
    cleanup: () => {
      scrollObserver?.kill();
      stop();
    },
  };
};
