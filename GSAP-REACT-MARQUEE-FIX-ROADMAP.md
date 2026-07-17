# GSAP React Marquee - Fix Roadmap

Status: implementation complete; `0.4.0` release gate verified

Last updated: 2026-07-17

Target package: `gsap-react-marquee`

Suggested release: `0.4.0`

## 1. Purpose

This document is the implementation contract for an AI coding agent tasked with
fixing the known correctness, accessibility, performance, packaging, and
dependency issues in this repository.

The agent must execute the milestones in order. A milestone is complete only
when its implementation, tests, documentation, and required verification
commands all pass. Passing TypeScript or Rollup alone is not proof that runtime
behavior is correct.

The current working tree already contains user changes in:

- `src/components/gsap-react-marquee.tsx`
- `src/components/gsap-reactmarquee.utils.ts`

Those changes are part of the baseline. Do not revert or overwrite them. Read
the current diff before starting each milestone and evolve the code from its
actual state.

## 2. Confirmed Product Decisions

These decisions are non-negotiable unless the user explicitly changes them.

1. `paused` is a controlled prop.
   - When `paused={true}`, hover, focus, drag, inertia, wheel, and delayed reverse
     callbacks must never restart the timeline.
   - When `paused` changes, runtime state must converge to the prop value.

2. `fill` is independent from direction.
   - `dir="up"` and `dir="down"` must not silently enable fill behavior.
   - With `fill={false}`, every direction renders one original plus one visual
     duplicate unless reduced-motion behavior intentionally renders only one.
   - With `fill={true}`, duplicate calculation uses the measured viewport and
     content size regardless of axis.

3. Vertical sizing must fail safely.
   - Clone rendering must never create a measurement feedback loop.
   - An unconstrained vertical viewport may use a stable first measurement, but
     it must not repeatedly grow because clones changed its own height.
   - Development builds should warn when vertical fill has no stable viewport
     height. Production behavior must remain finite and deterministic.

4. Backward compatibility is preferred for `0.4.0`.
   - Additive props are allowed.
   - Existing public utility exports must not be removed in this release.
   - Potentially breaking export cleanup belongs in a later major release.

## 3. Known Findings

| ID | Severity | Area | Current problem |
| --- | --- | --- | --- |
| BUG-01 | High | Vertical sizing | Vertical mode forces fill-like duplication and can grow until the clone cap. |
| BUG-02 | Medium | Reverse loop | Finite repeats do not run correctly for `right` and `down`. |
| BUG-03 | Medium | Controlled state | Hover and drag callbacks can resume a controlled paused timeline. |
| BUG-04 | Medium | Draggable | Reverse plus paused can skip Draggable initialization; no-inertia release is incomplete. |
| BUG-05 | Medium | Numeric input | Zero, negative, `NaN`, or infinite values can produce invalid GSAP durations. |
| BUG-06 | Medium | Zero measurement | Zero-sized content or hidden containers can cause division by zero. |
| BUG-07 | Medium | Accessibility | Visual clones duplicate focusable controls, IDs, and screen-reader content. |
| BUG-08 | Medium | Fill coverage | The fixed clone cap can leave the viewport uncovered. |
| PERF-01 | Medium | React effects | `children` identity can rebuild the timeline after unrelated parent renders. |
| PERF-02 | Low | Bundle | GSAP interaction plugins and class utilities may load when unused. |
| COMPAT-01 | Medium | Browser accessibility | Native `inert` cannot be assumed for every potential browser target. |
| QUAL-01 | High risk | Verification | No unit tests, browser tests, lint command, or repeatable verification gate exists. |
| SEC-01 | High risk | Toolchain | The lockfile contains known high and moderate build-time advisories. |
| DOC-01 | Medium | Documentation | README behavior differs from current vertical and fill semantics. |

## 4. AI Agent Operating Rules

The implementing agent must follow these rules for every milestone.

1. Read this document, `package.json`, the relevant source files, and the current
   `git diff` before editing.
2. Execute exactly one milestone per session or conversation. Do not begin the
   next milestone in the same session, even when the current milestone finishes
   early. Start the next milestone with fresh context and a new handoff packet.
3. Add or update a regression test before, or in the same change as, each bug
   fix. The test must fail against the faulty behavior and pass after the fix.
4. Preserve unrelated user changes. Do not run destructive Git commands.
5. Keep public behavior unchanged unless this roadmap explicitly changes it.
6. Prefer pure helpers for calculations and browser integration tests for layout
   behavior. JSDOM is not authoritative for element dimensions or GSAP motion.
7. Do not add an abstraction unless it removes repeated state or clarifies a
   lifecycle boundary.
8. Do not publish, tag, or bump the package version unless explicitly requested
   by the user. Create a milestone-scoped commit only when the session prompt
   authorizes commits and every milestone checklist is green. Otherwise report
   that the milestone is ready to commit and stop.
9. After each milestone, report:
   - files changed;
   - behavior changed;
   - tests added;
   - commands run and their result;
   - remaining risks or deferred work.
10. Update this document's milestone checkboxes only after the relevant
    acceptance criteria pass.
11. At the beginning of every session, restate these two decisions in the
    working notes before editing:
    - `paused` is controlled;
    - `fill` is independent from direction.
12. If a milestone is too large for one session, stop at a named sub-milestone
    boundary, leave the milestone unchecked, and produce a complete handoff. Do
    not continue with reduced context or silently omit tests.

### Session Boundary and Handoff Protocol

This roadmap is intentionally a multi-session program. It is not a prompt for a
single uninterrupted agent run.

Each session receives only:

- this roadmap;
- the active milestone name and allowed scope;
- `git status --short`;
- the current diff for files in scope;
- the previous milestone completion report or commit SHA;
- any unresolved risk that can affect the active milestone.

Before editing, the agent must print a short preflight record:

```text
Active milestone: Mx
Paused is controlled: confirmed
Fill is direction-independent: confirmed
Working tree reviewed: yes
Previous milestone checks: green / not applicable
Files allowed in this session: ...
```

At the end of the session, the agent must provide a handoff packet containing:

- completed and incomplete checklist items;
- exact files changed;
- `git diff --stat` and a summary of the relevant diff;
- commands run with pass/fail results;
- remaining failures, risks, and assumptions;
- whether the milestone is ready for a green commit;
- the next milestone name, without starting it.

Recommended repository workflow:

1. Start a fresh session for one milestone.
2. Implement and verify that milestone only.
3. Review the diff against the confirmed product decisions.
4. Commit only when every required check for that milestone is green and commit
   authorization exists.
5. Start the next session from that commit plus this roadmap and the handoff.

M2 may be split into two sessions because it owns the most fragile lifecycle:

- `M2A`: stable measurement snapshot and ResizeObserver guard;
- `M2B`: fill formula, root viewport API, browser coverage tests, and docs.

M2 remains incomplete until both sub-milestones are green. Do not start M3 after
only M2A.

### Git Branching Workflow

Use one integration branch for the release and one short-lived branch per
milestone. Do not implement milestone work directly on the integration branch.

Integration branch:

```text
release/0.4.0
```

Milestone branches, merged sequentially into `release/0.4.0`:

| Milestone | Branch |
| --- | --- |
| M0 Verification baseline | `fix/m0-verification-baseline` |
| M1 Numeric normalization | `fix/m1-numeric-normalization` |
| M2 Vertical sizing and fill | `fix/m2-vertical-sizing-fill` |
| M3 Timeline control | `fix/m3-timeline-control` |
| M4 Accessibility and reduced motion | `fix/m4-a11y-reduced-motion` |
| M5 React performance and bundle | `fix/m5-react-perf-bundle` |
| M5.1 Vertical wrap and clone entry | `fix/m5.1-vertical-wrap-entry` |
| M6 Security, docs, and release | `fix/m6-security-docs-release` |

Required flow:

1. Create or check out `release/0.4.0` from the approved baseline.
2. Create the active milestone branch from the current `release/0.4.0` HEAD.
3. Implement only that milestone on its branch.
4. Update `CHANGELOG.md` under `Unreleased` with every user-visible change,
   internal change, test addition, documentation change, and known limitation
   introduced by the milestone.
5. Run the milestone checks and review the diff against this roadmap.
6. Commit the milestone branch only when its checklist is green and commit
   authorization exists.
7. Merge the milestone branch into `release/0.4.0`, preferably with
   `--no-ff` so milestone history remains visible.
8. Run the integration checks on `release/0.4.0` before creating the next
   milestone branch.
9. Repeat until M6 is merged and the final release gate passes.

### Consumer-Project Validation Before Every Merge

Before merging any milestone branch into `release/0.4.0`, the agent must make
the milestone available as a package and the user must verify its behavior in a
real consumer React project. Unit, browser, typecheck, and build checks are not
enough to replace this validation.

Required sequence on the milestone branch:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
pnpm pack --pack-destination ../gsap-marquee-artifacts
```

Install the generated `.tgz` in the consumer project:

```bash
pnpm remove gsap-react-marquee
pnpm add ../gsap-marquee-artifacts/gsap-react-marquee-<version>.tgz
pnpm dev
```

The user must verify the behavior changed by the active milestone in the real
application, including relevant interactions, layout, SSR/build behavior, and
the confirmed product decisions (`paused` is controlled and `fill` is
independent from direction). The agent must provide a short manual-test
checklist tailored to the milestone and record the result in the handoff.

Merge is blocked until all of the following are true:

- [ ] `CHANGELOG.md` accurately records the milestone under `Unreleased`.
- [ ] The package `.tgz` installs successfully in the consumer project.
- [ ] The user has manually verified the milestone behavior in that project.
- [ ] No regression is observed in the consumer project.
- [ ] The user has explicitly confirmed the milestone is ready to merge.

`pnpm link` may be used for exploratory development, but the packed `.tgz` is
the required pre-merge validation artifact because it exercises package exports,
dependencies, generated files, and CSS more realistically.

Branch rules:

- [ ] No direct implementation commits on `release/0.4.0`.
- [ ] Each milestone branch contains only its milestone scope and required
      tests/documentation.
- [ ] A later milestone branch starts from the integration branch after all
      earlier milestone merges, never from stale `main`.
- [ ] Never merge a milestone whose required checks are failing or skipped.
- [ ] Never merge a milestone without its `CHANGELOG.md` update.
- [ ] Resolve conflicts by preserving the confirmed decisions: controlled
      `paused` and direction-independent `fill`.
- [ ] Do not delete milestone branches until the integration merge and checks
      are recorded in the handoff.
- [ ] Do not rebase or force-push the integration branch during the release
      sequence unless explicitly authorized.

Suggested merge sequence:

```text
fix/m0-verification-baseline  -> release/0.4.0
fix/m1-numeric-normalization  -> release/0.4.0
fix/m2-vertical-sizing-fill   -> release/0.4.0
fix/m3-timeline-control       -> release/0.4.0
fix/m4-a11y-reduced-motion    -> release/0.4.0
fix/m5-react-perf-bundle      -> release/0.4.0
fix/m6-security-docs-release  -> release/0.4.0
```

## 5. Global Definition of Done

The roadmap is complete only when all of the following are true.

- [x] All milestone acceptance criteria pass.
- [x] No ResizeObserver or React render feedback loop exists.
- [x] `paused` remains controlled across every interaction path.
- [x] `fill` behavior is identical across horizontal and vertical directions.
- [x] Finite and infinite loop semantics are tested in all four directions.
- [x] Invalid numeric inputs cannot create `NaN`, `Infinity`, or negative GSAP
      durations.
- [x] Hidden or zero-sized content waits for a valid measurement.
- [x] Visual clones are excluded from keyboard and accessibility trees.
- [x] Visual clone isolation works with and without native `inert` support.
- [x] Reduced-motion users receive a non-moving presentation by default.
- [x] Parent rerenders with equivalent DOM do not reset the animation.
- [x] TypeScript, lint, unit tests, browser tests, build, package smoke tests, and
      dependency audit pass.
- [x] ESM, CommonJS, SSR import, and generated declaration entrypoints work.
- [x] README documents the actual supported behavior and constraints.
- [x] `CHANGELOG.md` contains every milestone change and its `Unreleased`
      entries are finalized under version `0.4.0` with the release date.

## 6. Target Verification Commands

Milestone 0 creates any scripts that do not yet exist. The final command set
should be equivalent to:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run test:browser
pnpm run build
npm pack --dry-run
pnpm run audit
```

The final package smoke tests must also import the package by its real name from
both ESM and CommonJS consumers. Do not test only direct `dist` paths.

## 7. Milestone Dependency Order

```text
M0 Verification baseline
  -> M1 Numeric normalization and zero measurements
    -> M2 Vertical sizing and fill
      -> M3 Timeline control, reverse, hover, scroll, and drag
        -> M4 Accessibility and reduced motion
          -> M5 React performance and bundle hygiene
            -> M5.1 Vertical wrap and clone entry
              -> M6 Security, documentation, and release gate
```

Milestones may not be reordered without documenting why their dependency is no
longer relevant. The dependency diagram describes repository order, not work to
perform in one conversation.

---

## Milestone 0 - Verification Baseline

### Goal

Create a trustworthy local test and verification foundation before changing
animation behavior.

### Scope

- `package.json`
- `pnpm-lock.yaml`
- new test configuration files
- new `tests/` or equivalent directories
- no intended production behavior changes

### Implementation Tasks

- [x] Add a `typecheck` script using `tsc --noEmit`.
- [x] Add a lint setup suitable for TypeScript and React hooks.
- [x] Add unit tests using Vitest or an equivalent established runner.
- [x] Add React rendering tests for markup and prop transitions.
- [x] Add real-browser tests using Playwright or an equivalent browser runner.
- [x] Create a minimal browser fixture that imports the package source or built
      package and can set exact viewport/container dimensions.
- [x] Add scripts named `test`, `test:watch`, and `test:browser`.
- [x] Add a top-level `check` script that runs typecheck, lint, and unit tests.
- [x] Add package smoke tests for:
  - ESM import;
  - CommonJS require;
  - generated type resolution;
  - SSR import and static render without `window` or `document` errors.
- [x] Define a mandatory local verification flow using a frozen lockfile.
- [x] Define the supported browser baseline, including the oldest WebKit/Safari
      target relevant to clone accessibility and `inert` behavior.
- [x] Run core checks on Node 20. Node 22 remains required in the final manual
      release matrix unless dependency constraints require a documented change.
- [x] Run browser tests locally in at least one Chromium-based browser.
- [x] Run Playwright WebKit locally as the Safari compatibility signal. Add a
      forced no-native-`inert` fallback test in M4.
- [x] Record a baseline browser screenshot or DOM measurement only where it is
      stable and useful. Avoid brittle animation-frame snapshots.

### Baseline Tests That Must Pass Before M1

- [x] `calculateDuplicateCount` returns one visual duplicate when `fill=false`.
- [x] Current default horizontal marquee builds a finite GSAP timeline.
- [x] ESM and CommonJS package entrypoints expose the same public names.
- [x] SSR render does not throw.
- [x] Build output includes JavaScript and declaration entrypoints listed in
      `package.json`.

### Acceptance Criteria

- [x] `pnpm run check` passes.
- [x] `pnpm run test:browser` passes.
- [x] `pnpm run test:browser:webkit` passes.
- [x] `pnpm run test:package` passes.
- [x] `pnpm run build` passes.
- [x] A frozen install and the documented local verification commands pass.
- [x] No existing public API was removed.

### Out of Scope

- Fixing known animation bugs.
- Updating all dependencies.
- Changing clone or accessibility behavior.
- Hosted CI and GitHub Actions. Verification is intentionally local and remains
  mandatory before every milestone merge.

---

## Milestone 1 - Numeric Normalization and Zero Measurements

### Goal

Guarantee that GSAP never receives invalid durations, offsets, or ratios.

### Scope

- `src/components/gsap-react-marquee.type.ts`
- `src/components/gsap-reactmarquee.utils.ts`
- `src/components/gsap-react-marquee.tsx`
- unit and browser tests

### Implementation Design

Create one internal pure normalization boundary. Suggested shape:

```ts
type NormalizedMarqueeOptions = {
  delay: number;
  loop: -1 | number;
  scrollSpeed: number;
  spacing: number;
  speed: number;
};
```

Use these fallback rules consistently:

| Input | Valid range | Invalid fallback |
| --- | --- | --- |
| `speed` | finite and `> 0` | `100` |
| `spacing` | finite and `>= 0` | `16` |
| `delay` | finite and `>= 0` | `0` |
| `scrollSpeed` | finite, then clamp to `1.1..4` | `2.5` |
| `loop` | integer `-1` or integer `>= 0` | `-1` |

Do not scatter these checks across event handlers.

### Implementation Tasks

- [x] Add `normalizeMarqueeOptions` or an equivalently named pure helper.
- [x] Normalize once before constructing measurement and animation options.
- [x] Ensure all timeline duration calculations use normalized `speed`.
- [x] Add a pure `hasUsableMeasurement` guard for finite positive item and track
      dimensions.
- [x] If measurement is zero or invalid, do not create a timeline or Draggable
      instance.
- [x] Keep ResizeObserver active so a hidden or unloaded element can initialize
      later when dimensions become positive.
- [x] Guard `trackLength` before calculating `1 / trackLength` for drag.
- [x] Guard every percentage calculation against a zero item size.
- [x] Normalize invalid values silently without recurring runtime warnings.
- [x] Preserve the existing InertiaPlugin `console.warn` in distributed builds;
      numeric normalization does not introduce a new warning.

### Required Regression Tests

- [x] `speed={0}` does not produce an infinite duration.
- [x] Negative speed falls back to `100`.
- [x] `speed={NaN}` and `speed={Infinity}` fall back to `100`.
- [x] Negative or non-finite spacing falls back to `16`.
- [x] Negative or non-finite delay falls back to `0`.
- [x] Invalid scroll speed falls back and then clamps correctly.
- [x] Fractional, less-than-`-1`, `NaN`, and infinite loop values fall back to
      `-1`.
- [x] Zero-width horizontal content creates no timeline until it becomes wider.
- [x] Zero-height vertical content creates no timeline until it becomes taller.
- [x] A container initially under `display:none` initializes after becoming
      visible.
- [x] No generated GSAP child tween has a negative or non-finite duration.

### Acceptance Criteria

- [x] All numeric normalization tests pass.
- [x] Browser tests prove delayed initialization after a zero measurement.
- [x] No division by zero remains in the animation path.
- [x] Default valid prop behavior is unchanged.

### Consumer-Project Manual Validation

Before merging M1, install its packed tarball in the real consumer project and
verify all of the following:

- [x] A default marquee and a marquee with valid numeric props still animate as
      before M1.
- [x] `speed={0}`, negative speed, `NaN`, and `Infinity` do not freeze the page
      or create console errors; the marquee uses the default speed.
- [x] Invalid `spacing` and `delay` values use their documented defaults without
      broken layout or delayed startup.
- [x] Invalid `scrollSpeed` values remain finite while `scrollFollow` is active.
- [x] Invalid fractional, negative, `NaN`, and infinite `loop` values fall back
      to infinite looping.
- [x] Content that starts at zero width or height begins animating after it gains
      a positive size, without remounting the marquee.
- [x] A marquee mounted inside `display:none` begins animating after its wrapper
      becomes visible.
- [x] The consumer development console, production build, and SSR path show no
      new errors or hydration failures.

Consumer validation passed on 2026-07-17 and was explicitly confirmed by the
user before starting M2A.

Known vertical fill behavior belongs to M2, and controlled hover/drag pause
behavior belongs to M3. Do not block M1 on those already-tracked bugs unless M1
introduces a new regression in them.

---

## Milestone 2 - Vertical Sizing and Fill Semantics

### Goal

Remove measurement feedback loops and make fill behavior independent from axis.

### Scope

- `src/components/gsap-react-marquee.tsx`
- `src/components/gsap-reactmarquee.utils.ts`
- `src/components/gsap-react-marquee.type.ts`
- `src/components/gsap-react-marquee.style.css`
- browser tests and README sections related to sizing

### Session Split

M2 should use two fresh sessions:

- `M2A` implements only the measurement snapshot, explicit observer guard,
  clone-application lifecycle, and convergence tests.
- `M2B` starts from green M2A, then implements direction-independent fill,
  spacing-aware clone calculation, root viewport props, browser coverage tests,
  and sizing documentation.

Do not combine M2A and M2B when the M2A handoff is not fully green. Neither
sub-milestone may change controlled `paused` behavior; that belongs to M3.

### Required Internal Separation

The implementation must distinguish these concepts:

```ts
const shouldFill = fill;
const usesContentTrack = fill || isVertical;
```

- `shouldFill` controls duplicate count only.
- `usesContentTrack` may control which DOM elements are animated and how the
  track is sized.
- Direction must never override `shouldFill`.

### Stable Measurement Model

Do not calculate clone count from a container size that was itself changed by
the previous clone count.

Use a measurement snapshot with these properties:

1. Capture viewport size and first content size before changing duplicate count.
2. Calculate duplicate count from that snapshot.
3. Render clones.
4. Build the timeline using the same snapshot.
5. Suppress or ignore the root ResizeObserver notification caused solely by that
   clone render.
6. Replace the snapshot only after an external viewport resize or a real content
   size change.

The suppression mechanism is not left to implementation preference. Use an
explicit clone-application guard and expected-size tracking, with names equivalent
to:

```ts
const isApplyingMeasuredClonesRef = useRef(false);
const measurementSnapshotRef = useRef<MeasurementSnapshot | null>(null);
const cloneAppliedRootSizeRef = useRef<number | null>(null);
```

Required lifecycle:

1. A root ResizeObserver entry may replace `measurementSnapshotRef` only when it
   is not known to be caused by clone application.
2. Before changing duplicate count, set `isApplyingMeasuredClonesRef.current` to
   true and retain the exact snapshot used for that calculation.
3. The clone render and timeline build must reuse that snapshot. They must not
   call `getTargetSize` again against the clone-expanded root.
4. In the layout phase after clones render, record the resulting root size in
   `cloneAppliedRootSizeRef`.
5. Ignore root observer entries while `isApplyingMeasuredClonesRef` is true.
   Also ignore a later entry that matches the recorded clone-applied root size
   and has no external invalidation signal.
6. Content observer entries remain independent. A real first-content size change
   invalidates the snapshot and the clone-applied-size marker.
7. Clear the applying flag only after the clone-render observer delivery window.
   `requestAnimationFrame` may be used for this lifecycle boundary and batching,
   but not as a heuristic debounce.
8. A later root size that differs from both the accepted viewport snapshot and
   the clone-applied root size is an external resize and may create a new
   snapshot.

Equivalent control flow is required:

```ts
function onRootResize(observedSize: number) {
  if (isApplyingMeasuredClonesRef.current) return;
  if (isSameSize(observedSize, cloneAppliedRootSizeRef.current)) return;

  acceptExternalViewportMeasurement(observedSize);
}

function applyMeasuredDuplicateCount(nextCount: number) {
  isApplyingMeasuredClonesRef.current = true;
  setDuplicateCount(nextCount);
}

useLayoutEffect(() => {
  cloneAppliedRootSizeRef.current = readActiveAxisSize(rootRef.current);

  const frame = requestAnimationFrame(() => {
    isApplyingMeasuredClonesRef.current = false;
  });

  return () => cancelAnimationFrame(frame);
}, [duplicateCount]);
```

`isSameSize` must use a small documented pixel tolerance instead of exact
floating-point equality. External content invalidation must clear the
clone-applied marker before accepting a new content-driven measurement.

Do not implement suppression with only a timeout, debounce, or "ignore the next
callback" counter. Those approaches can hide the loop while still accepting a
clone-derived measurement on a later callback.

The agent may isolate this logic in a small measurement hook, but it must remain
separate from GSAP timeline construction and must not set clone state from inside
`useGSAP`.

### Root Viewport API

Add backward-compatible root styling support:

```ts
containerClassName?: string;
containerStyle?: CSSProperties;
```

Rules:

- Existing `className` continues to apply to repeated content wrappers.
- `containerClassName` applies only to the root viewport.
- `containerStyle` merges with the internal CSS custom property without losing
  `--gradient-color`.
- Internal required layout styles must remain effective.
- Document explicit height as recommended for vertical marquees.

### Fill Calculation

Account for spacing when calculating coverage.

Suggested model:

```text
itemExtent = contentSize + spacing
requiredTrack = targetSize + itemExtent
totalItems = ceil((requiredTrack + spacing) / itemExtent)
duplicateCount = max(1, totalItems - 1)
```

The exact formula may change after browser tests, but it must guarantee enough
track length for the viewport plus one seamless wrap segment.

### Clone Limit

- [x] Add an optional `maxDuplicates` prop with a documented finite default.
- [x] Normalize it to a positive integer.
- [x] Keep a hard internal safety ceiling to prevent accidental DOM explosion.
- [x] If the configured ceiling prevents full coverage, keep finite output and
      emit one development-only warning.
- [x] The default should cover realistic logo/text marquees without stopping at
      the current arbitrary limit of 15.

### Implementation Tasks

- [x] Remove the `fill: usesContentTrack` override passed to duplicate
      calculation.
- [x] Keep vertical track offset fixes without changing fill semantics.
- [x] Replace or retire `hasDefinedDimension` if it relies on computed pixel
      values to infer authored `auto` sizing.
- [x] Separate measurement from timeline construction.
- [x] Add the explicit clone-application guard and clone-applied-size comparison
      defined above.
- [x] Prevent clone-generated root resize events from replacing the measurement
      snapshot, including delayed duplicate observer deliveries.
- [x] Do not use debounce or elapsed time as the primary correctness mechanism.
- [x] Add `containerClassName` and `containerStyle`.
- [x] Update duplicate calculation to include spacing.
- [x] Add and normalize `maxDuplicates`.
- [x] Ensure direction changes rebuild axis-specific measurement once, without a
      clone growth sequence.
- [x] Preserve behavior when images or fonts change first-content dimensions.

### Required Regression Tests

- [x] `fill=false` renders one original plus one duplicate for all directions.
- [x] Vertical `fill=false` does not calculate clones from viewport height.
- [x] Vertical `fill=true` in a fixed 320px viewport covers the viewport.
- [x] Horizontal `fill=true` in a fixed 800px viewport covers the viewport.
- [x] Unconstrained vertical content does not repeatedly grow to the clone cap.
- [x] Clone count stabilizes after at most one clone-render adjustment for one
      measurement snapshot.
- [x] An instrumented ResizeObserver test proves that clone application does not
      increment the accepted viewport-measurement count.
- [x] Replaying the clone-applied root size across multiple observer deliveries
      does not create a new snapshot or state update.
- [x] A genuinely different external root size is accepted after the guard clears.
- [x] Resizing a constrained vertical viewport from 320px to 480px produces one
      new stable clone count.
- [x] Changing `up` to `down` does not change clone count.
- [x] Changing horizontal to vertical remeasures the active axis.
- [x] Very small content either covers the viewport or reaches the documented
      safety ceiling with one warning.
- [x] Spacing `0`, default spacing, and large valid spacing all remain seamless.

### Acceptance Criteria

- [x] No ResizeObserver loop or repeated React clone-growth sequence occurs.
- [x] `fill` is direction-independent in implementation and tests.
- [x] Fixed-size horizontal and vertical browser fixtures show no visible gap
      during at least two full cycles.
- [x] New root styling props are present in generated declarations.
- [x] README sizing examples use a constrained vertical viewport.

### M2A Consumer-Project Manual Validation

Before merging M2A, install its packed tarball in the real consumer project and
verify all of the following:

- [ ] An unconstrained vertical marquee reaches one stable height and does not
      grow repeatedly or render 15 clones.
- [ ] DevTools shows no `ResizeObserver loop` errors or repeated clone DOM churn.
- [ ] Horizontal and vertical marquees still animate with their existing M1
      behavior after mount.
- [ ] Content that changes size after mount, including images, produces one new
      stable measurement and continues animating.
- [ ] A genuine parent/container resize is accepted after clone rendering and
      produces one stable recalculation.
- [ ] Changing between horizontal and vertical directions remeasures the active
      axis once without a growth sequence.
- [ ] Consumer development, production build, and SSR paths show no new errors
      or hydration failures.

M2A does not fix direction-dependent `fill`; that remains an expected M2B issue
and must not be treated as an M2A regression.

### M2B Consumer-Project Manual Validation

Before merging M2, install the M2B packed tarball in the real consumer project
and verify all of the following:

- [ ] With `fill={false}`, `left`, `right`, `up`, and `down` each render one
      original plus one duplicate and animate as before.
- [ ] Horizontal `fill` covers a constrained viewport with spacing `0`, default
      spacing, and one large valid spacing without a visible sequence gap.
- [ ] Vertical `fill` with an explicit root height covers the viewport for both
      `up` and `down` without a visible sequence gap.
- [ ] Resizing a constrained horizontal or vertical viewport produces one new
      stable clone count without `ResizeObserver` errors.
- [ ] `containerClassName` applies only to the root; `containerStyle` applies
      width/height/background without breaking gradient or required layout.
- [ ] A low `maxDuplicates` keeps DOM output finite and emits no more than one
      development warning when full coverage is impossible.
- [ ] Consumer development, production build, and SSR paths show no new errors,
      hydration failures, or non-finite GSAP durations.

---

## Milestone 3 - Timeline Control, Reverse, Hover, Scroll, and Drag

### Goal

Make timeline state deterministic and ensure controlled pause semantics across
every interaction path.

### Scope

- `src/components/gsap-react-marquee.tsx`
- `src/components/gsap-reactmarquee.utils.ts`
- browser and unit tests

### Reverse Loop Design

Use different initialization for finite and infinite reverse timelines.

```text
Finite loop (`loop >= 0`):
  start at totalProgress(1)
  reverse through the full total duration
  do not use the infinite onReverseComplete jump

Infinite loop (`loop === -1`):
  start at progress(1)
  use one onReverseComplete continuation strategy
```

There must be only one owner for reverse-complete behavior. Remove the duplicate
callback currently split between component timeline creation and the animation
utility.

### Controlled Pause Design

Create one state transition helper or equivalent centralized logic:

```ts
resumeTimeline({ timeline, isReverse, paused });
```

Required behavior:

- `paused=true`: always end paused.
- `paused=false` and forward direction: play forward.
- `paused=false` and reverse direction: play in reverse.
- Delayed callbacks must re-check the latest controlled paused value before
  resuming.
- A stale callback from a previous render must be killed during cleanup.

### Implementation Tasks

- [x] Fix finite reverse initialization using total timeline progress.
- [x] Keep the reverse continuation callback only for infinite timelines.
- [x] Centralize play, reverse, and pause transitions.
- [x] Make hover leave respect controlled `paused`.
- [x] Use pointer events where appropriate; add focus-in/focus-out handling for
      keyboard users when pause-on-hover behavior is enabled.
- [x] Initialize Draggable regardless of initial pause or direction.
- [x] Make `onThrowComplete` respect controlled `paused` in every direction.
- [x] Add a no-inertia `onRelease` path that restores the correct controlled
      timeline state.
- [x] Kill inertia, delayed calls, Observer instances, and timeline tweens during
      cleanup.
- [x] Ensure scroll-follow cannot resume a paused timeline.
- [x] Ensure scroll-follow returns to the base direction and time scale after its
      response tween.
- [x] Verify whether current scroll speed is unintentionally squared. Define one
      multiplier interpretation and document it.
- [x] Prevent hover, focus, drag, and scroll handlers from capturing stale paused
      values. Use a latest-value ref only where necessary.

Consumer-validation decision: preserve the legacy `scrollSpeed²` transient
response curve because `scrollSpeed` is an interaction-strength input, then
restore the configured direction at base `timeScale=1`. Every infinite timeline
owns the single reverse-continuation callback so temporary scroll reversal
cannot stop forward marquees at time zero.

### Required Regression Tests

- [x] `loop=0`, `1`, `2`, and `-1` behave correctly for left.
- [x] The same loop matrix behaves correctly for right.
- [x] The same loop matrix behaves correctly for up.
- [x] The same loop matrix behaves correctly for down.
- [x] Finite reverse timelines execute exactly `loop + 1` cycles.
- [x] `paused=true` remains paused after pointer enter and leave.
- [x] `paused=true` remains paused after focus enters and leaves.
- [x] `paused=true` remains paused after drag release with inertia.
- [x] `paused=true` remains paused after drag release without inertia.
- [x] `paused=true` remains paused after scroll-follow input.
- [x] Changing `paused` from true to false resumes in the configured direction.
- [x] Changing `paused` from false to true stops active base and interaction
      tweens.
- [x] Reverse plus paused still creates a usable Draggable instance.
- [x] Unmount during reverse delay leaves no active delayed call.
- [x] React StrictMode mount, cleanup, and remount leaves one active timeline and
      one listener set.

### Acceptance Criteria

- [x] Controlled `paused` semantics pass every interaction test.
- [x] Finite reverse repeat counts are exact.
- [x] Infinite reverse remains continuous for at least two test windows without
      a visible jump.
- [x] No duplicate listeners or active GSAP resources remain after cleanup.

---

## Milestone 4 - Accessibility and Reduced Motion

### Goal

Keep visual repetition out of keyboard, form, and accessibility semantics while
providing a safe non-moving experience for reduced-motion users.

### Scope

- component props and rendering
- clone markup and post-render handling if required
- CSS motion behavior
- SSR, React, and browser accessibility tests
- README accessibility guidance

### Public API Additions

Add these backward-compatible capabilities or an equivalent typed API:

```ts
containerProps?: Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "className" | "style" | "ref"
>;
respectReducedMotion?: boolean; // default true
```

`containerClassName` and `containerStyle` remain the dedicated class/style
channels defined in M2.

### Clone Semantics

- Every visual duplicate wrapper must use `aria-hidden="true"`.
- Every visual duplicate wrapper must be inert.
- The original is the only semantic and keyboard-accessible copy.
- Initial SSR output should render only the original. Client measurement may add
  visual clones after hydration.
- Clone creation must not produce duplicate form submissions or focus targets.

Arbitrary React children can generate nested IDs and controls. The agent must not
claim this is solved by `aria-hidden` alone.

### Confirmed Child-Content Contract for 0.4.0

The design decision is fixed before implementation:

- `0.4.0` supports presentational marquee children.
- Arbitrary interactive children are not a supported use case in this release.
- Stable IDs and ID-reference relationships inside repeated children are not a
  supported use case in this release.
- Interactive-child support requires a future explicit render-item API and is
  deferred to a major-version design milestone.

The implementation must still fail safely when unsupported content is provided:

- render only the original during SSR;
- add visual clones only after client measurement;
- mark every clone subtree hidden and inert;
- run a clone-safety layout pass that removes clone `id` and form `name`
  participation, removes clone-local ID-reference attributes, and takes all
  focusable descendants out of sequential tab order;
- emit one development-only warning when the original contains an ID, link,
  button, form control, editable node, or non-negative `tabindex`;
- rerun the clone-safety pass when clone count or rendered child content changes;
- document that ID-based styling or SVG references inside repeated children may
  not survive clone sanitization and are outside the `0.4.0` support contract.

This is a defensive boundary, not an attempt to support arbitrary interactive
React trees. The agent must not redesign the public API midway through M4.

### Native Inert Compatibility and Fallback

Do not assume native `inert` support across every browser the package may claim
to support.

- [x] Define and document the supported browser baseline before closing M4.
- [x] Feature-detect native support on the client with an SSR-safe check
      equivalent to `"inert" in HTMLElement.prototype`.
- [x] Use native `inert` when available.
- [x] Always set `aria-hidden="true"`; it remains required even with native
      `inert`.
- [x] Add clone CSS that disables pointer interaction.
- [x] Without native `inert`, set `tabindex="-1"` on focusable clone descendants
      and remove form `name` participation.
- [x] Add a focus-in safety handler for a programmatic focus that enters a visual
      clone in a non-native-inert browser.
- [x] Test the fallback path independently from the native path.
- [x] Do not hand-roll a general inert polyfill. If the declared browser baseline
      requires complete inert semantics beyond this clone-specific fallback, use
      a maintained polyfill and record its bundle cost.

### Reduced Motion

- [x] Default `respectReducedMotion` to true.
- [x] Subscribe to `(prefers-reduced-motion: reduce)` using a cleanup-safe media
      query listener.
- [x] Under reduced motion, render one static original and create no GSAP
      timeline, Observer, or Draggable instance.
- [x] React to preference changes without reloading.
- [x] Explicit `respectReducedMotion={false}` may restore animation.
- [x] Controlled `paused` remains valid regardless of motion preference.

### Implementation Tasks

- [x] Add typed root container attributes.
- [x] Merge user and internal event handlers without losing either.
- [x] Make clones inaccessible and inert, with the explicit feature-detected
      fallback defined above.
- [x] Add the clone-safety layout pass for IDs, ID references, form names, and
      focusable descendants.
- [x] Add one development warning for content outside the presentational-only
      contract.
- [x] Prevent clone form controls from affecting form submission even though
      interactive children are unsupported.
- [x] Prevent duplicate IDs in initial SSR markup.
- [x] Add reduced-motion subscription and cleanup.
- [x] Extend pause-on-hover behavior to focus while retaining controlled pause.
- [x] Document the presentational-only child contract and deferred interactive
      support.

### Required Regression Tests

- [x] SSR with a child ID contains that ID once.
- [x] SSR with a button contains one accessible button.
- [x] Client clones have `aria-hidden` and inert semantics.
- [x] Tab navigation reaches only the original interactive child.
- [x] Cloned form inputs do not add submitted values.
- [x] Unsupported interactive or ID-bearing content emits one development warning.
- [x] The native-inert path leaves no clone focus target.
- [x] The forced no-native-inert fallback leaves no sequential clone focus target.
- [x] Programmatic focus entering a fallback clone is removed or redirected.
- [x] Clone IDs, ID references, and form names are sanitized after client clone
      creation.
- [x] No duplicate root-level ARIA label is generated.
- [x] Reduced motion creates no timeline or plugin instance.
- [x] Changing reduced motion at runtime tears down or initializes animation once.
- [x] `respectReducedMotion={false}` preserves normal animation.
- [x] User-provided `aria-label`, `role`, and `data-*` container props survive.

### Acceptance Criteria

- [x] Automated accessibility checks report no duplicate interactive clones.
- [x] Reduced-motion behavior is static by default.
- [x] SSR and hydration produce no warning.
- [x] The supported browser baseline and no-native-inert fallback are documented.
- [x] The presentational-only child contract is explicit in README, generated API
      documentation, and release notes.

---

## Milestone 5 - React Performance and Bundle Hygiene

### Goal

Prevent unnecessary timeline resets and reduce baseline cost without destabilizing
the corrected lifecycle.

### Scope

- React effect dependencies
- ResizeObserver and optional MutationObserver ownership
- GSAP imports
- class-name utility usage and export layout
- package metadata
- bundle measurements

### React Effect Tasks

- [x] Remove `children` object identity from animation effect dependencies.
- [x] Rebuild only when primitive animation options or real measurements change.
- [x] Let ResizeObserver detect size changes.
- [x] Add MutationObserver only if tests prove same-size DOM mutations require
      timeline reconstruction.
- [x] Keep transient measurement and callback values in refs where they should
      not trigger render.
- [x] Avoid derived-state effects when clone count can be derived from a stable
      measurement snapshot.
- [x] Verify that an unrelated parent state update does not change timeline
      identity, total time, or listener count.
- [x] Ensure StrictMode does not double-register global listeners.

### Bundle Tasks

- [x] Measure baseline minified and gzip sizes for default-only and interactive
      consumers.
- [x] Replace `gsap/all.js` with direct module imports where package compatibility
      allows.
- [x] Verify GSAP 3.12 and 3.13 import compatibility before changing paths.
- [x] Consider conditional dynamic imports for Observer, Draggable, and Inertia
      only if measured savings justify asynchronous lifecycle complexity.
- [x] Cache any conditional plugin import promise at module level.
- [x] Ensure optional plugin loading cannot initialize after unmount.
- [x] Stop using `tailwind-merge` inside the default component when simple class
      composition is sufficient.
- [x] Keep existing `cn` exports for `0.4.0`; mark them deprecated if moving to a
      future utility subpath.
- [x] Remove unused `react-dom` peer dependency.
- [x] Review `sideEffects` metadata carefully. CSS injection must not be removed
      by consumer tree shaking.
- [x] Do not minify away diagnostics that are part of supported runtime behavior.

### Required Regression Tests

- [x] Equivalent parent rerenders do not recreate the timeline.
- [x] Actual content size changes do recreate measurement and timeline once.
- [x] Changing speed, direction, loop, spacing, fill, or paused updates behavior.
- [x] Default usage does not initialize Draggable or Observer when conditional
      loading is implemented.
- [x] Interactive props initialize each required plugin once.
- [x] Unmount before an optional import resolves creates no resources.
- [x] CSS still appears when importing only the default component.
- [x] ESM tree-shaking smoke fixture builds successfully.
- [x] CommonJS consumer remains functional.

### Acceptance Criteria

- [x] Parent rerender regression test passes.
- [x] No effect depends on a non-primitive value without a documented reason.
- [x] Bundle size does not regress accidentally; intentional changes are recorded.
- [x] Default, scroll-follow, and draggable fixtures all build and run.
- [x] Public exports remain compatible for `0.4.0`.

### Verification Record

- Baseline (`gsap/all.js`): default consumer 156,230 minified / 57,364 gzip
  bytes; interactive consumer 156,258 / 57,372 bytes.
- Milestone 5 result: default initial consumer 86,814 minified / 33,155 gzip
  bytes; interactive total 130,352 / 50,035 bytes. Bundle smoke budgets are
  90,000 / 35,000 and 135,000 / 52,000 bytes respectively.
- The optional Draggable and Observer graph measured 43,164 minified / 15,488
  gzip bytes, justifying conditional loading. Import promises are module-cached;
  registration occurs only after a mounted requester receives the module.
- `gsap/Draggable.js` and `gsap/Observer.js` runtime exports plus their official
  type modules were verified against npm tarball `gsap@3.12.5`; the installed
  `gsap@3.13.0` passes type, unit, Chromium, WebKit, build, ESM, and CommonJS
  checks. `InertiaPlugin.js` is absent from the 3.12.5 tarball, so momentum is
  feature-detected from a consumer-registered plugin instead of imported.
- Same-size child identity changes require accessibility rescanning but no
  timeline rebuild; ResizeObserver covers geometry changes, so MutationObserver
  was not added. Clone count remains stateful only because clone-application
  suppression must be armed before the DOM commit that changes root geometry.
- `sideEffects` remains intentionally unspecified. The distributed JavaScript
  injects CSS, so declaring the bundle side-effect-free would risk losing styles;
  the default-only tree-shaking fixture asserts that injected CSS survives.

---

## Milestone 5.1 - Vertical Wrap and Clone Entry Correction

### Status

Complete. Automated matrix and packed-tarball consumer validation pass.

### Goal

Make vertical `dir="up"` and `dir="down"` loops re-enter from the correct
edge every time. A cloned `.gsap-react-marquee-content` must not appear in the
middle of the viewport during a wrap, including after a timeline rebuild,
clone-count change, resize, pause/resume, or direction change.

### Reported Symptom

In vertical mode, the visual clone sometimes disappears and reappears from the
middle instead of entering from below (`up`) or above (`down`). Reproduction is
intermittent. The affected element is the repeated
`.gsap-react-marquee-content`, not the semantic original.

### Investigation Hypotheses

Treat these as hypotheses, not fixes. Prove the failing invariant first:

- `offsetTop` is layout-space while `yPercent`/`y` are transform-space; mixing
  them can calculate an entry point from stale geometry.
- `gap` contributes to flex layout but is not represented consistently in the
  per-item offset and wrap distance.
- Re-initialization can read a clone while it still has a previous GSAP
  transform, then use that transformed value as its new baseline.
- `fromTo` entry values may render before the clone is positioned outside the
  viewport, exposing an intermediate position for one frame.
- Vertical `height: max-content` and unconstrained roots can change the
  percentage basis between measurement and timeline construction.

### Scope

- [x] Capture deterministic vertical reproductions for `up` and `down` at
      multiple speeds, spacings, root heights, content heights, and clone
      counts.
- [x] Instrument each content clone's `DOMRect` and computed transform on every
      animation frame around a wrap.
- [x] Define one coordinate space for vertical measurement, entry, exit, and
      wrap calculations; document conversion boundaries.
- [x] Reset or normalize stale clone transforms before using them as a new
      timeline baseline.
- [x] Ensure `up` re-entry starts at or below the viewport's lower edge and
      `down` re-entry starts at or above its upper edge, within a documented
      frame-distance tolerance.
- [x] Preserve horizontal behavior, `fill` direction independence, spacing,
      finite/infinite loop semantics, dragging, scroll-follow, and reduced
      motion.
- [x] Do not add a MutationObserver or change the public prop contract unless
      a failing regression proves it necessary.

### Investigation Evidence - 2026-07-17

- Added `tests/browser/m5.1-reproduction.spec.ts` as a deterministic
  characterization of the reported `dir="up"`, `spacing={24}` example. The
  fixture uses the example's `200px` by `300px` centered flex parent and an
  equivalent `400px` content stack (four `80px` image rows, one `48px` text
  row, and four `8px` gaps).
- Without an explicit height on the component root, the root grows to `824px`
  (two `400px` items plus `24px` spacing). Chromium observed wrap entry at
  `140px` to `169px` inside the parent's visible `300px` viewport; WebKit
  observed `155px` to `181px`. This deterministically reproduces the apparent
  middle entry.
- With `containerStyle={{ height: "100%" }}`, the root remains `300px` high.
  Chromium observed entry at `416px` to `447px`; WebKit observed `406px` to
  `432px`, below the lower viewport edge as required.
- The pre-fix browser trace used `speed={3000}` to collect several wraps in one
  second. Final `up` and `down` regressions run `speed={80}` unchanged and wait
  for natural wraps. Stress cases use `speed={3000}` with a per-wrap tolerance
  equal to the greater of elapsed-time travel and observed non-wrapping-item
  travel for that sampled frame, plus `4px` subpixel margin.
- This example proves a missing root-height constraint, not stale transforms or
  mixed coordinate spaces. Do not change animation math from this evidence
  alone; continue the M5.1 matrix with a constrained root, both directions,
  rebuilds, and clone-count changes.
- Fix: `.gsap-react-marquee-vertical` now fills the parent's available height
  by default and uses flex/grid stretch as a layout fallback. The zero-specificity
  default preserves `containerClassName` overrides; inline `containerStyle`
  sizes also remain authoritative. The public API is unchanged.
- The characterization is now a regression using the example's real structure:
  four explicit `64px` image rows, Tailwind-equivalent padding and gaps, and a
  `32px` GSAP label. Neither test supplies `containerStyle` or
  `containerClassName`. Both `up` and `down` keep the root at `200px` by
  `300px` and assert repeated entry from the correct edge.
- A second real fixture covers the `h-[420px]`, `text-5xl`, `py-8` title. Its
  natural item is `112px`; before correction the two-item content track was
  `256px` and wrapped at `143px` inside the `420px` viewport. Normal mode now
  animates wrappers sized to `max(contentSize, viewportSize)`, producing entry
  at `451px` below the viewport.
- Reverse tall-content tracing exposed a separate measurement mismatch: a
  `400px` content item used a `300px` stretched wrapper and re-entered with
  `101px` still visible. Wrapper sizing now uses the stable natural
  `contentSize` snapshot, so reverse entry starts fully above the viewport.
- `useGSAP({ revertOnUpdate: true })` normalizes GSAP transforms before every
  rebuild. Segment construction then reads layout offsets relative to the root,
  converts the existing pixel/percent transform at one explicit boundary, and
  clears pixel translation after setting normalized percentages. Browser
  assertions observe root-relative `DOMRect` values and the active computed
  transform.

### Required Regression Tests

- [x] Unit test vertical segment math for one item, two items, spacing, and
      both directions; assert finite positions and positive travel distances.
- [x] Browser test repeated `up` wraps with `fill={false}` and `fill={true}`;
      first visible frame after leaving through the top must originate at the
      bottom edge, never the middle.
- [x] Browser test repeated `down` wraps with `fill={false}` and `fill={true}`;
      first visible frame after leaving through the bottom must originate at
      the top edge, never the middle.
- [x] Run the same assertions after resize, clone-count change, pause/resume,
      direction change, and timeline re-initialization.
- [x] Add a stress run covering at least 100 wrap opportunities per direction
      with no mid-viewport entry and no visible coverage gap.
- [x] Keep existing horizontal, accessibility, reduced-motion, Chromium, and
      WebKit suites green.
- [x] Repeat packed-tarball manual test for the corrected vertical behavior.

### Acceptance Criteria

- [x] No observed vertical clone enters from the middle of the viewport in the
      deterministic stress matrix.
- [x] `up` and `down` entry origins remain symmetric within tolerance.
- [x] No visible gap appears at wrap boundaries across 100 cycles per
      direction.
- [x] No regression in horizontal marquee, clone count, timeline identity, or
      listener count.
- [x] Chromium and WebKit browser suites pass.
- [x] `pnpm run check`, `pnpm run test:package`, and packed-consumer checks pass.
- [x] README troubleshooting notes describe the corrected vertical invariant.

### Exit Evidence

- Coordinate decision: parent layout owns available viewport size; the marquee
  root automatically consumes that size, while measured content and clones own
  only track length. Wrap assertions use viewport-relative `DOMRect` values.
- Reported example: `200px` by `300px` parent, natural `400px` content,
  `spacing={24}`, `fill={false}`, `gradient={true}`, and real `speed={80}` for
  `up`. Root resolves to `200px` by `300px`; entry occurs below the bottom edge.
  Accelerated symmetric `down` coverage enters above the top edge.
- `pnpm run check`: pass (`69` unit tests).
- Chromium browser suite: pass (`65` tests).
- WebKit browser suite: pass (`65` tests; all `10` M5.1 cases also pass together
  with the final per-frame movement instrumentation).
- `pnpm run test:package`: pass for build, ESM, CommonJS, types, SSR, CSS, and
  consumer bundle budgets.
- Packed-tarball consumer validation passes. M6 also installs the refreshed
  archive in isolated React 18/GSAP 3.12 and React 19/GSAP 3.13 consumers and
  runs an actual Chromium animation smoke from each install.

---

## Milestone 6 - Security, Documentation, and Release Gate

### Goal

Remove known toolchain advisories, align documentation with behavior, and prove
that the package is ready for release.

### Known Advisory Targets

At audit time the lockfile included affected versions of:

- `rollup@4.48.1`
- `minimatch@5.1.6`
- `picomatch@4.0.3`
- `serialize-javascript@6.0.2`
- `svgo@2.8.0`
- `brace-expansion@2.0.2`
- `postcss@8.5.6`
- `yaml@1.10.2`

The agent must re-query the current advisory database before selecting versions.
Do not rely only on this dated list.

### Dependency Tasks

- [x] Upgrade Rollup beyond the affected range.
- [x] Upgrade Rollup plugins to compatible supported versions.
- [x] Upgrade or override vulnerable transitive packages where upstream packages
      have not yet released compatible versions.
- [x] Prefer an upstream plugin upgrade over a permanent broad override.
- [x] Replace abandoned build plugins if secure transitive resolution is not
      possible.
- [x] Pin a package manager version through `packageManager` in `package.json`.
- [x] Select a package manager version compatible with the documented Node
      support and current npm bulk advisory endpoint.
- [x] Regenerate `pnpm-lock.yaml` from a clean install.
- [x] Update stale Browserslist data if it remains part of the build graph.
- [x] Run a full lockfile audit, not only direct production dependencies.
- [x] Document any accepted advisory with impact analysis and expiration date.

### README Tasks

- [x] Document controlled `paused` semantics.
- [x] Document that `fill` is independent from direction.
- [x] Add a constrained-height vertical example using `containerStyle` or
      `containerClassName`.
- [x] Document numeric normalization and defaults.
- [x] Document `maxDuplicates` and safety-ceiling behavior.
- [x] Document reduced-motion defaults.
- [x] Document clone accessibility and supported child content.
- [x] Correct draggable/Inertia fallback behavior.
- [x] Document root container props.
- [x] Update development commands to match actual scripts.
- [x] Add the React and Node compatibility matrix.

### Package and Release Tasks

- [x] Verify `package.json` exports for import, require, and types.
- [x] Verify generated declaration files contain all new props.
- [x] Run package tests from the packed tarball, not only repository source.
- [x] Confirm the tarball contains only intended files.
- [x] Verify CSS injection in ESM and CommonJS consumers.
- [x] Verify SSR import and render in React 18 and React 19 fixtures.
- [x] Review source maps and minification policy for a published library.
- [x] Prepare release notes grouped by fixes, accessibility, performance,
      dependencies, and compatibility.
- [x] Recommend `0.4.0` unless implementation introduces an explicitly breaking
      public API change.

### Final Required Test Matrix

| Environment | Required checks |
| --- | --- |
| Node 20 | typecheck, lint, unit, build, ESM/CJS smoke |
| Node 22 | typecheck, lint, unit, build, audit |
| React 18 | render, SSR, browser animation smoke |
| React 19 | render, SSR, browser animation smoke |
| Chromium | full layout, resize, loop, drag, accessibility suite |
| WebKit or forced legacy path | inert fallback, focus isolation, reduced motion |
| Packed tarball | import, require, types, CSS, SSR |

### Acceptance Criteria

- [x] No known high or moderate advisory remains without documented acceptance.
- [x] All final verification commands pass from a clean checkout/install.
- [x] Packed artifact smoke tests pass.
- [x] README matches implementation and generated types.
- [x] `git diff --check` is clean.
- [x] No unrelated file or metadata churn is present.
- [x] Final report lists residual risks honestly; it does not claim proof of zero
      bugs.

### Implementation Evidence - 2026-07-17

- Live full-lockfile audit initially found `7` high and `5` moderate
  advisories, including newer 2026 advisories absent from the original target
  list. After upstream upgrades and build-plugin replacement, the same audit
  reports zero known advisories. No advisory is muted or accepted.
- Rollup is `4.62.2`; official Rollup plugins use their current compatible
  releases. The abandoned `rollup-plugin-postcss` dependency graph was removed
  and replaced by a small local SSR-safe injector using `lightningcss@1.32.0`.
- `pnpm@10.34.5` is pinned because it supports both Node 20 and 22. The newer
  pnpm 11 line requires Node 22.13 or later and cannot cover the Node 20 matrix.
- No Browserslist database remains in the CSS build path; Lightning CSS receives
  the source directly and minifies without Browserslist discovery.
- Published ESM and CommonJS are minified without source maps for `0.4.0`.
  Supported diagnostics remain in production output, and CSS is minified and
  injected once behind a `document` guard.
- Node 20.19.4: typecheck, lint, `69` unit tests, build, ESM/CommonJS smoke,
  package smoke, bundle budgets, Chromium, WebKit, and audit pass.
- Node 22.15.1: typecheck, lint, `69` unit tests, build, and audit pass.
- Chromium: `65` tests pass. WebKit: `65` tests pass, including native and
  forced legacy inert paths, focus isolation, and reduced motion.
- Packed consumers pass under React 18.3.1/GSAP 3.12.5 and React 19.2.7/GSAP
  3.13.0 for ESM, CommonJS, declarations, SSR, CSS, and real browser animation.
- Tarball allowlist is exactly `LICENSE`, `README.md`, `package.json`,
  `dist/index.cjs`, `dist/index.esm.js`, and `dist/index.d.ts`.

---

## 8. Residual Risk Register

Track these risks throughout implementation.

| Risk | Mitigation |
| --- | --- |
| CSS-defined vertical height is difficult to classify as authored or content-sized | Use a stable measurement snapshot, suppress clone-caused resize feedback, and provide explicit root style props. |
| Arbitrary React children can generate nested IDs and interactive state | `0.4.0` explicitly supports presentational children only; detect unsupported content, warn once, and apply clone safety defenses. |
| GSAP plugin exports differ across supported versions | Test exact peer range fixtures before changing import paths. |
| Async plugin imports may resolve after unmount | Cache promises, use cancellation flags, and test unmount-before-resolve. |
| Browser animation tests may be timing-sensitive | Assert state, geometry, and cycle counts with tolerances instead of pixel-perfect frame timing. |
| Public utility exports limit dependency cleanup | Preserve in `0.4.0`, deprecate first, remove only in a major release. |
| ResizeObserver can emit multiple entries per layout change | Batch with one animation frame and prove convergence in tests. |
| Direct DOM clone safety mutations can conflict with React reconciliation | Isolate clone-only effects and rerun after relevant content changes. If React ownership makes the fixed safety contract impossible, mark M4 blocked and request a user decision; do not silently weaken it. |

## 9. Deferred Major-Version Cleanup

Do not include these changes in `0.4.0` unless the user explicitly approves a
breaking release.

- Remove or move `cn` and internal animation utilities from the root export.
- Remove `tailwind-merge` and `clsx` if no public entrypoint still requires them.
- Redesign the prop API so root HTML props can be spread directly without the
  legacy inner-content `className` meaning.
- Replace imperative clone sanitation with a stricter render-item API if
  interactive marquee content becomes a supported use case.
- Consider separate core and interaction entrypoints for stronger bundle
  isolation.
- Revisit whether CSS should be injected by JavaScript or exported as an explicit
  stylesheet entrypoint.

## 10. Completion Report Template

The final implementing agent should return a report in this form:

```markdown
## Outcome

Implemented milestones: M0-M5.1, M6
Suggested release: 0.4.0

## Behavior Fixed

- ...

## Public API Added or Changed

- ...

## Tests Added

- Unit: ...
- Browser: ...
- Packaging: ...

## Verification

- `pnpm run typecheck`: pass/fail
- `pnpm run lint`: pass/fail
- `pnpm run test`: pass/fail
- `pnpm run test:browser`: pass/fail
- `pnpm run build`: pass/fail
- `npm pack --dry-run`: pass/fail
- dependency audit: pass/fail

## Residual Risks

- ...
```
