import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  getTargetSize,
  hasUsableMeasurement,
} from "./gsap-reactmarquee.utils";

export const MEASUREMENT_PIXEL_TOLERANCE = 0.5;

export type MarqueeMeasurementSnapshot = {
  axis: "horizontal" | "vertical";
  contentSize: number;
  rootSize: number;
  viewportSize: number;
};

type UseMarqueeMeasurementOptions = {
  className: string | undefined;
  containerClassName: string | undefined;
  containerStyle: CSSProperties | undefined;
  contentDependency: ReactNode;
  duplicateCount: number;
  isVertical: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
};

export const isSameMeasuredSize = (
  first: number | null,
  second: number | null
): boolean => {
  return (
    first !== null &&
    second !== null &&
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    Math.abs(first - second) <= MEASUREMENT_PIXEL_TOLERANCE
  );
};

const areSnapshotsEqual = (
  first: MarqueeMeasurementSnapshot | null,
  second: MarqueeMeasurementSnapshot | null
): boolean => {
  if (first === second) return true;
  if (!first || !second || first.axis !== second.axis) return false;

  return (
    isSameMeasuredSize(first.contentSize, second.contentSize) &&
    isSameMeasuredSize(first.rootSize, second.rootSize) &&
    isSameMeasuredSize(first.viewportSize, second.viewportSize)
  );
};

const readActiveAxisSize = (
  element: HTMLElement,
  isVertical: boolean
): number => {
  return isVertical ? element.offsetHeight : element.offsetWidth;
};

const getFirstContentElement = (
  container: HTMLElement
): HTMLElement | null => {
  return container.querySelector(
    ".gsap-react-marquee .gsap-react-marquee-content"
  );
};

export const useMarqueeMeasurement = ({
  className,
  containerClassName,
  containerStyle,
  contentDependency,
  duplicateCount,
  isVertical,
  rootRef,
}: UseMarqueeMeasurementOptions) => {
  const isApplyingMeasuredClonesRef = useRef(false);
  const measurementSnapshotRef =
    useRef<MarqueeMeasurementSnapshot | null>(null);
  const cloneApplicationSnapshotRef =
    useRef<MarqueeMeasurementSnapshot | null>(null);
  const cloneAppliedRootSizeRef = useRef<number | null>(null);
  const [measurementVersion, setMeasurementVersion] = useState(0);

  const publishSnapshot = useCallback(
    (nextSnapshot: MarqueeMeasurementSnapshot | null): boolean => {
      if (areSnapshotsEqual(measurementSnapshotRef.current, nextSnapshot)) {
        return false;
      }

      measurementSnapshotRef.current = nextSnapshot;
      setMeasurementVersion((version) => version + 1);
      return true;
    },
    []
  );

  const readExternalSnapshot = useCallback((): MarqueeMeasurementSnapshot | null => {
    const container = rootRef.current;
    if (!container) return null;

    const firstContentElement = getFirstContentElement(container);
    if (!firstContentElement) return null;

    const rootSize = readActiveAxisSize(container, isVertical);
    const contentSize = readActiveAxisSize(firstContentElement, isVertical);
    const viewportSize = getTargetSize(container, isVertical);

    if (!hasUsableMeasurement(rootSize, contentSize, viewportSize)) {
      return null;
    }

    return {
      axis: isVertical ? "vertical" : "horizontal",
      contentSize,
      rootSize,
      viewportSize,
    };
  }, [isVertical, rootRef]);

  const acceptExternalMeasurement = useCallback((): boolean => {
    return publishSnapshot(readExternalSnapshot());
  }, [publishSnapshot, readExternalSnapshot]);

  const acceptContentMeasurement = useCallback((): boolean => {
    const container = rootRef.current;
    if (!container) return publishSnapshot(null);

    const firstContentElement = getFirstContentElement(container);
    if (!firstContentElement) return publishSnapshot(null);

    const axis = isVertical ? "vertical" : "horizontal";
    const contentSize = readActiveAxisSize(firstContentElement, isVertical);
    const currentSnapshot = measurementSnapshotRef.current;

    if (
      currentSnapshot?.axis === axis &&
      isSameMeasuredSize(contentSize, currentSnapshot.contentSize)
    ) {
      return false;
    }

    isApplyingMeasuredClonesRef.current = false;
    cloneApplicationSnapshotRef.current = null;
    cloneAppliedRootSizeRef.current = null;

    if (!hasUsableMeasurement(contentSize)) {
      return publishSnapshot(null);
    }

    if (currentSnapshot?.axis === axis) {
      const accepted = publishSnapshot({
        ...currentSnapshot,
        contentSize,
      });
      const contentAppliedRootSize = readActiveAxisSize(container, isVertical);
      cloneAppliedRootSizeRef.current = hasUsableMeasurement(
        contentAppliedRootSize
      )
        ? contentAppliedRootSize
        : null;
      return accepted;
    }

    return acceptExternalMeasurement();
  }, [acceptExternalMeasurement, isVertical, publishSnapshot, rootRef]);

  const acceptRootMeasurement = useCallback((): boolean => {
    const container = rootRef.current;
    if (!container || isApplyingMeasuredClonesRef.current) return false;

    const rootSize = readActiveAxisSize(container, isVertical);
    if (isSameMeasuredSize(rootSize, cloneAppliedRootSizeRef.current)) {
      return false;
    }

    const currentSnapshot = measurementSnapshotRef.current;
    const axis = isVertical ? "vertical" : "horizontal";
    if (
      currentSnapshot?.axis === axis &&
      isSameMeasuredSize(rootSize, currentSnapshot.rootSize)
    ) {
      return false;
    }

    cloneAppliedRootSizeRef.current = null;
    return acceptExternalMeasurement();
  }, [acceptExternalMeasurement, isVertical, rootRef]);

  const beginCloneApplication = useCallback(
    (snapshot: MarqueeMeasurementSnapshot) => {
      const container = rootRef.current;
      const currentRootSize = container
        ? readActiveAxisSize(container, isVertical)
        : null;

      if (
        currentRootSize !== null &&
        !isSameMeasuredSize(currentRootSize, snapshot.rootSize) &&
        !isSameMeasuredSize(currentRootSize, cloneAppliedRootSizeRef.current)
      ) {
        acceptExternalMeasurement();
        return false;
      }

      isApplyingMeasuredClonesRef.current = true;
      cloneApplicationSnapshotRef.current = snapshot;
      return true;
    },
    [acceptExternalMeasurement, isVertical, rootRef]
  );

  useLayoutEffect(() => {
    if (!isApplyingMeasuredClonesRef.current) return;

    const container = rootRef.current;
    if (!container) return;

    const cloneAppliedRootSize = readActiveAxisSize(container, isVertical);
    cloneAppliedRootSizeRef.current = hasUsableMeasurement(cloneAppliedRootSize)
      ? cloneAppliedRootSize
      : null;

    const animationFrameId = requestAnimationFrame(() => {
      isApplyingMeasuredClonesRef.current = false;
      cloneApplicationSnapshotRef.current = null;
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [duplicateCount, isVertical, rootRef]);

  useLayoutEffect(() => {
    const container = rootRef.current;
    if (!container) return;

    const firstContentElement = getFirstContentElement(container);
    const axis = isVertical ? "vertical" : "horizontal";
    const currentSnapshot = measurementSnapshotRef.current;

    if (!currentSnapshot || currentSnapshot.axis !== axis) {
      isApplyingMeasuredClonesRef.current = false;
      cloneApplicationSnapshotRef.current = null;
      cloneAppliedRootSizeRef.current = null;
      acceptExternalMeasurement();
    } else {
      acceptContentMeasurement();
    }

    let contentAnimationFrameId: number | null = null;
    const scheduleContentMeasurement = () => {
      if (contentAnimationFrameId !== null) return;

      contentAnimationFrameId = requestAnimationFrame(() => {
        contentAnimationFrameId = null;
        acceptContentMeasurement();
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            const hasContentEntry = entries.some(
              ({ target }) => target === firstContentElement
            );
            const contentInvalidated = hasContentEntry
              ? acceptContentMeasurement()
              : false;
            const hasRootEntry = entries.some(
              ({ target }) => target === container
            );

            if (hasRootEntry && !contentInvalidated) {
              acceptRootMeasurement();
            }
          });

    resizeObserver?.observe(container);
    if (firstContentElement) resizeObserver?.observe(firstContentElement);

    const pendingImages = Array.from(container.querySelectorAll("img"));
    pendingImages.forEach((image) => {
      if (image.complete) return;
      image.addEventListener("load", scheduleContentMeasurement);
      image.addEventListener("error", scheduleContentMeasurement);
    });

    return () => {
      resizeObserver?.disconnect();
      pendingImages.forEach((image) => {
        image.removeEventListener("load", scheduleContentMeasurement);
        image.removeEventListener("error", scheduleContentMeasurement);
      });
      if (contentAnimationFrameId !== null) {
        cancelAnimationFrame(contentAnimationFrameId);
      }
    };
  }, [
    acceptContentMeasurement,
    acceptExternalMeasurement,
    acceptRootMeasurement,
    className,
    containerClassName,
    containerStyle,
    contentDependency,
    isVertical,
    rootRef,
  ]);

  return {
    beginCloneApplication,
    cloneApplicationSnapshotRef,
    cloneAppliedRootSizeRef,
    isApplyingMeasuredClonesRef,
    measurementSnapshotRef,
    measurementVersion,
  };
};
