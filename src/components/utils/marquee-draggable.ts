import { gsap } from "gsap";
import type { MarqueeDraggablePlugins } from "./marquee-plugins";

let hasWarnedMissingInertiaPlugin = false;

type GSAPTimeline = ReturnType<typeof gsap.timeline>;
type DraggableInstance = ReturnType<
  MarqueeDraggablePlugins["Draggable"]["create"]
>[number];

/** Dependencies needed to bind Draggable without coupling it to React. */
type SetupMarqueeDraggableOptions = {
  cancelReverseDelay: () => void;
  delay: number;
  dragTrigger: HTMLElement | HTMLElement[];
  enabled: boolean;
  isReverse: boolean;
  isVertical: boolean;
  plugins?: MarqueeDraggablePlugins;
  positionProperty: "x" | "y";
  readPaused: () => boolean;
  restoreControlledState: () => void;
  scheduleReverseResume: (data: string) => gsap.core.Tween;
  timeline: GSAPTimeline;
  trackLength: number;
};

/**
 * Connects GSAP Draggable to marquee timeline progress.
 * Returns nothing when draggable support is disabled or unavailable.
 */
export const setupMarqueeDraggable = ({
  cancelReverseDelay,
  delay,
  dragTrigger,
  enabled,
  isReverse,
  isVertical,
  plugins,
  positionProperty,
  readPaused,
  restoreControlledState,
  scheduleReverseResume,
  timeline,
  trackLength,
}: SetupMarqueeDraggableOptions): (() => void) | undefined => {
  const Draggable = plugins?.Draggable;
  if (typeof Draggable !== "function" || !enabled) return;

  const dragProxy = document.createElement("div");
  const wrapProgress = gsap.utils.wrap(0, 1);
  let dragRatio: number;
  let dragStartProgress: number;
  let throwDelayTween: gsap.core.Tween | undefined;
  const draggableState: { instance?: DraggableInstance } = {};

  const restoreAfterDrag = () => {
    throwDelayTween?.kill();

    if (isReverse && delay > 0 && !readPaused()) {
      timeline.pause();
      throwDelayTween = scheduleReverseResume(
        "gsap-react-marquee-drag-delay"
      );
      return;
    }

    restoreControlledState();
  };

  const syncTimelineToDrag = () => {
    const draggableInstance = draggableState.instance;
    if (!draggableInstance) return;

    const dragDelta = isVertical
      ? draggableInstance.startY - draggableInstance.y
      : draggableInstance.startX - draggableInstance.x;

    timeline.progress(
      wrapProgress(dragStartProgress + dragDelta * dragRatio)
    );
  };

  const hasInertiaPlugin = Boolean(gsap.plugins.inertia);
  if (!hasInertiaPlugin && !hasWarnedMissingInertiaPlugin) {
    hasWarnedMissingInertiaPlugin = true;
    console.warn(
      "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
    );
  }

  draggableState.instance = Draggable.create(dragProxy, {
    trigger: dragTrigger,
    type: isVertical ? "y" : "x",
    onPress() {
      cancelReverseDelay();
      throwDelayTween?.kill();
      draggableState.instance?.tween?.kill();
      gsap.killTweensOf(dragProxy);
      gsap.killTweensOf(timeline);
      timeline.pause();
      dragStartProgress = timeline.progress();
      dragRatio = 1 / trackLength;
      gsap.set(dragProxy, {
        [positionProperty]: dragStartProgress / -dragRatio,
      });
    },
    onDrag: syncTimelineToDrag,
    onThrowUpdate: syncTimelineToDrag,
    overshootTolerance: 0,
    inertia: hasInertiaPlugin,
    onRelease(this: DraggableInstance) {
      if (!this.isThrowing) restoreAfterDrag();
    },
    onThrowComplete() {
      restoreAfterDrag();
    },
  })[0];

  return () => {
    throwDelayTween?.kill();
    draggableState.instance?.tween?.kill();
    draggableState.instance?.kill();
    gsap.killTweensOf(dragProxy);
    dragProxy.remove();
  };
};
