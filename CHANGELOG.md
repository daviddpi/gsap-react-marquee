# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Made development diagnostics browser-safe when consumers do not provide a
  Node-style `process` global.
- Optional Observer and Draggable failures now settle independently, preserve
  the base timeline, clear rejected loader caches, and retry after the feature
  is disabled and re-enabled.
- Missing-Inertia diagnostics now emit once instead of on every draggable
  timeline rebuild.
- Builds now remove stale output and declaration intermediates before exposing
  the exact three intended `dist` artifacts.

### Compatibility

- Added Firefox to the Playwright release gate, TypeScript `5.5.2` consumer
  coverage, pure-Rollup checks for unprotected `process.env`, and exact ESM/CJS
  utility export contracts.
- Stabilized loop-gap sampling across browser frame rates by requiring both two
  complete cycles and the existing minimum frame count.

### Documentation

- Documented controlled `paused` behavior, an accessible play/pause pattern,
  public utility contracts, intentional `0.4.0` semantic changes, and optional
  plugin degradation behavior.

## [0.4.0] - 2026-07-17

### Fixes

- Stabilized numeric normalization, zero-size initialization, vertical sizing,
  fill coverage, finite/reverse loops, controlled pause, drag release, scroll
  response, resize convergence, and vertical clone entry geometry.

### Accessibility

- Added reduced-motion static rendering, semantic single-original SSR output,
  inaccessible visual clones, native-`inert` handling, Safari fallback focus
  isolation, root ARIA/data/event props, and presentational-child diagnostics.

### Performance

- Prevented equivalent parent rerenders from rebuilding animation resources,
  cached optional plugin imports, removed default `tailwind-merge` execution,
  and reduced initial and interactive consumer bundle sizes with enforced
  budgets.

### Dependencies

- Upgraded Rollup to `4.62.2` and the supported Rollup plugin set, including
  `@rollup/plugin-terser` `1.0.0` and `rollup-plugin-dts` `6.4.1`.
- Replaced the unmaintained `rollup-plugin-postcss` chain with a local,
  SSR-safe CSS injector compiled by `lightningcss` `1.32.0`.
- Upgraded Vite, Vitest, jsdom, and the React 19 development runtime to secure
  current versions; pinned `pnpm@10.34.5` for Node 20/22 compatibility.
- Re-queried the live advisory database on 2026-07-17. Full lockfile audit
  reports zero known advisories; no advisory is accepted or muted.

### Compatibility

- Added real packed-tarball consumers for React 18/GSAP 3.12 and React 19/GSAP
  3.13, covering ESM, CommonJS, declarations, SSR, CSS injection, Chromium
  animation, and the exact published-file allowlist.
- Declared Node.js 20 and 22 as the supported release matrix and Node 20 as the
  minimum package engine.
- Added a complete local release command covering typecheck, lint, unit,
  Chromium, WebKit, packed artifacts, bundle budgets, dependency audit, and
  whitespace validation.

### Added

- Added the Milestone 0 verification baseline with unit, browser, and package
  smoke tests.
- Added automated type checking, linting, coverage, and combined verification
  scripts.
- Added mandatory local verification commands for Chromium, WebKit, and package
  entry points before each milestone merge.
- Added documented browser support targets and test-environment limitations.
- Added the `release/0.4.0` milestone branch workflow and mandatory packed-package
  validation in a real consumer project before each merge.
- Added centralized numeric option normalization and positive measurement guards.
- Added browser regressions for zero-width, zero-height, and initially hidden
  marquees that initialize after becoming measurable.
- Added an axis-specific measurement snapshot lifecycle with instrumented
  ResizeObserver and browser convergence coverage.
- Added `containerClassName` and `containerStyle` for root viewport styling.
- Added normalized `maxDuplicates` control with a default of `100`, an internal
  ceiling of `250`, and one development warning when the limit prevents fill.
- Added focus-in and focus-out handling to `pauseOnHover` so keyboard focus uses
  the same deterministic pause behavior as pointer hover.
- Added Milestone 3 unit and browser regressions for the complete direction and
  loop matrix, controlled pause interactions, drag release, scroll response,
  cleanup, and React StrictMode remounts.
- Added `containerProps` for typed ARIA, `data-*`, and event attributes on the
  root viewport.
- Added `respectReducedMotion`, enabled by default, with live
  `prefers-reduced-motion` updates and static single-original rendering.
- Added native-`inert` and forced fallback accessibility regressions for clone
  focus, forms, IDs, ID references, SSR, hydration, and root attributes.
- Added parent-rerender, real-resize, optional-plugin cache, pre-load unmount,
  ESM tree-shaking, CSS injection, and bundle-size regressions.

### Changed

- Reordered package export conditions so TypeScript resolves the declaration
  entry point before runtime entries.
- Updated repository ignore rules for generated test and package artifacts.
- Invalid `speed`, `spacing`, `delay`, `scrollSpeed`, and `loop` values now use
  documented finite fallbacks before reaching GSAP.
- Timeline and drag initialization now wait for finite positive measurements;
  invalid geometry cannot create negative or non-finite animation durations.
- Clone count updates now occur outside GSAP timeline construction and reuse the
  exact viewport/content snapshot that produced them.
- Root resize notifications caused by clone rendering are ignored during clone
  application and on delayed matching deliveries, while genuine external and
  first-content resizes remain observable.
- `fill` now controls duplicate count independently from direction; normal mode
  renders one original plus one duplicate for all four directions.
- Fill coverage now includes spacing and one complete wrap segment.
- Root measurement now uses actual axis geometry instead of computed-style
  heuristics, and simultaneous external resize plus clone updates are preserved.
- Finite reverse marquees now initialize from total timeline progress and run
  exactly `loop + 1` cycles; infinite reverse marquees keep one continuation
  callback and remain continuous.
- Timeline play, reverse, and pause transitions now share one controlled-state
  helper and re-check the latest `paused` value from delayed and interaction
  callbacks.
- Draggable now initializes while paused or reversed, restores controlled state
  after releases with or without inertia, and kills inertia and proxy resources
  during cleanup.
- Scroll following now preserves the legacy `scrollSpeed²` transient boost,
  keeps forward infinite timelines continuous during temporary reversal,
  cannot resume a controlled pause, and restores the configured direction at
  base `timeScale` after each response.
- Hover handling now uses pointer events, coordinates pointer and keyboard focus
  state, and cannot override controlled `paused` behavior.
- Timeline updates and unmounts now kill pending reverse delays, scroll response
  tweens, observers, timeline-targeting tweens, and Draggable resources.
- Initial SSR output now contains only the semantic original; visual clones are
  added after client measurement and marked `aria-hidden` and inert.
- Visual clones now disable pointer interaction and sanitize IDs, ID references,
  form names, and sequential focus targets. A focus guard covers browsers
  without native `inert`.
- Reduced motion now tears down clones, timelines, Observer, Draggable, and
  related GSAP resources; disabling the preference restores normal controlled
  behavior.
- Layout effects now use an SSR-safe isomorphic boundary.
- Equivalent parent rerenders no longer rebuild the GSAP timeline or reconnect
  measurement and interaction listeners; real ResizeObserver measurements still
  rebuild the timeline once.
- Observer and Draggable now use cached conditional imports and register only
  while a requesting component remains mounted. Direct plugin paths work across
  the verified GSAP 3.12.5 and 3.13.0 package layouts.
- Default component class composition no longer executes `tailwind-merge`;
  existing `cn` exports remain compatible.
- Removed the unused `react-dom` peer dependency while retaining it as a test
  development dependency.
- Production minification now preserves supported runtime diagnostics.
- Draggable feature-detects a consumer-registered InertiaPlugin, preserving
  direct dragging when momentum support is unavailable.
- Vertical marquees now fill the available parent height automatically, keeping
  the component root equal to the visual viewport instead of allowing cloned
  content to expand it. Explicit `containerStyle` sizing remains an override.
- Vertical normal mode now animates viewport-sized wrappers while fill mode
  animates measured content repeats. Wrapper sizing uses the natural content
  snapshot, so short items enter from the far edge and content taller than the
  viewport exits fully before reverse entry.

### Notes

- Milestone 0 changes verification infrastructure only; marquee runtime behavior
  is unchanged.
- GitHub Actions is intentionally not used. Node.js 20 is the verified Milestone
  0 baseline; Node.js 22 remains part of the manual `0.4.0` release matrix.
- Numeric normalization is intentionally silent and does not emit repeated
  runtime warnings.
- Milestone 2 was delivered in M2A/M2B phases. The surrounding layout still
  defines available space, but vertical marquee roots now consume that height
  automatically without a component sizing prop.
- `0.4.0` supports presentational marquee children. Interactive children,
  stable child IDs, and ID-reference relationships remain unsupported and emit
  one development warning; clone sanitization is defensive, not full
  interactive-child support.
- Milestone 5 measured the default initial consumer bundle at 86,814 minified
  bytes and 33,155 gzip bytes, down from a 156,230 / 57,364-byte `gsap/all.js`
  baseline. The interactive total is 130,352 / 50,035 bytes, down from
  156,258 / 57,372 bytes. Package smoke tests guard both budgets.

## [0.3.2]

### Added

- Added runtime notes for Next.js client components.
- Documented the forwarded ref for the root container.

### Changed

- Declared `gsap` and `@gsap/react` as explicit peer dependencies.
- Updated sizing, styling, and troubleshooting documentation.

## [0.3.0]

### Added

- Added proper Y-axis animations for the `up` and `down` directions.
- Added gradient overlays that adapt to the marquee orientation.

### Changed

- Refactored the animation engine to support both the X and Y axes.

### Removed

- **Breaking:** Removed the `alignVertical` prop. Vertical layouts now use
  native flex behavior.

## [0.2.4]

### Added

- Added intelligent container detection.
- Added a maximum duplicate limit to prevent performance issues.

### Changed

- Improved the duplicate calculation algorithm.
- Improved target-width looping logic.
