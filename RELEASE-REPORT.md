# 0.4.0 Release Report

Date: 2026-07-17

## Outcome

Implemented milestones: M0-M5.1, M6

Suggested release: `0.4.0`

No public export was removed and no explicitly breaking API change was added.

## Behavior Fixed

- Numeric options cannot create negative, infinite, or `NaN` GSAP durations.
- Hidden and zero-sized marquees wait for usable measurements.
- Vertical sizing and clone application converge without resize feedback loops.
- `fill` covers the viewport independently from direction and remains bounded.
- Finite, infinite, forward, and reverse timelines keep deterministic loop and
  controlled-pause behavior across hover, focus, scroll, drag, and rebuilds.
- Vertical normal mode re-enters from the correct viewport edge for short and
  tall content.
- Reduced motion renders one static semantic original and tears down animation
  and interaction resources.
- Visual clones are hidden from accessibility/focus behavior through native
  `inert` or the tested fallback path.
- Equivalent React rerenders preserve timeline and listener identity.

## Public API Added or Changed

- Added root-only `containerClassName`, `containerStyle`, and `containerProps`.
- Added bounded `maxDuplicates` with default `100` and hard ceiling `250`.
- Added `respectReducedMotion`, enabled by default.
- Clarified controlled `paused`, direction-independent `fill`, numeric
  normalization, presentational-child support, and Inertia fallback semantics.
- Kept existing utility exports for backward compatibility.

## Dependencies and Packaging

- Rollup upgraded to `4.62.2`; official Rollup plugins and
  `rollup-plugin-dts` upgraded to supported compatible releases.
- Abandoned `rollup-plugin-postcss` removed. A local SSR-safe Rollup transform
  now minifies CSS with `lightningcss@1.32.0` and injects it once in browsers.
- Vite, Vitest, jsdom, and the React 19 development runtime upgraded.
- `pnpm@10.34.5` pinned; package engine set to Node.js 20 or newer.
- Live full-lockfile audit reports zero known advisories. No advisory is muted
  or accepted.
- Published artifact contains exactly six intended files: license, README,
  package metadata, ESM, CommonJS, and bundled declarations.
- ESM/CommonJS and CSS are minified. Supported diagnostics remain. Source maps
  are intentionally not published for `0.4.0`.

## Tests Added

- Unit: normalization, measurement, clone safety, reduced motion, optional
  plugins, timeline control, and vertical segment coverage.
- Browser: `65` Chromium and `65` WebKit cases covering layout, resize, loops,
  drag, scroll, accessibility, reduced motion, StrictMode, and M5.1 wrap stress.
- Packaging: real tarball installs under React 18.3.1/GSAP 3.12.5 and React
  19.2.7/GSAP 3.13.0; ESM, CommonJS, types, SSR, CSS, published files, and
  Chromium animation are exercised from the installed package name.
- Bundle: default and interactive consumer budgets plus optional-plugin delta.

## Verification

| Environment or command | Result |
| --- | --- |
| `pnpm@10.34.5 install --frozen-lockfile` on Node 20.19.4 | Pass |
| Node 20 typecheck, lint, `69` unit tests, build | Pass |
| Node 22.15.1 typecheck, lint, `69` unit tests, build | Pass |
| `pnpm run test:browser` (`65` Chromium tests) | Pass |
| `pnpm run test:browser:webkit` (`65` WebKit tests) | Pass |
| Packed React 18/19 consumer matrix | Pass |
| ESM, CommonJS, declarations, SSR, CSS injection | Pass |
| Default bundle: 86,726 minified / 33,102 gzip bytes | Pass |
| Interactive bundle: 130,264 minified / 49,982 gzip bytes | Pass |
| `npm pack --dry-run` (6 files, 17.6 kB archive) | Pass |
| Full dependency audit at moderate threshold | Pass, 0 advisories |
| `git diff --check` | Pass |

## Residual Risks

- WebKit plus a forced no-`inert` path is a strong compatibility signal, not an
  exact Safari 14.1 device test. Firefox support also lacks an automated final
  matrix run.
- `0.4.0` supports presentational children only. Interactive children, stable
  IDs, and child ID-reference relationships remain unsupported.
- Momentum dragging depends on a consumer-registered `InertiaPlugin`; direct
  dragging remains available without it.
- Optional GSAP imports are tested at 3.12.5 and 3.13.0, not every patch in the
  declared peer range.
- The advisory result is a dated database snapshot and can change after
  release.
- Passing this matrix reduces known release risk; it does not prove zero bugs.
