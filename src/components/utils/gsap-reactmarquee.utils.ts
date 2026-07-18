/**
 * Public utility facade retained at the package root.
 *
 * Implementations live in focused modules; these re-exports preserve the
 * package API and existing consumer import paths.
 */
export {
  coreAnimation,
  createMarqueeAnimation,
  resumeTimeline,
  type ResumeTimelineOptions,
} from "./marquee-animation";
export {
  calculateDuplicateCount,
  calculateDuplicateCountResult,
  calculateDuplicates,
  cn,
  type DuplicateCountResult,
  getEffectiveBackgroundColor,
  getMinSize,
  getMinWidth,
  getTargetSize,
  getTargetWidth,
  hasDefinedWidth,
  hasUsableMeasurement,
  setupContainerStyles,
} from "./marquee-layout";
export {
  type NormalizedMarqueeOptions,
  normalizeMarqueeOptions,
} from "./marquee-options";
