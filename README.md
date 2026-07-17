# GSAP React Marquee

`gsap-react-marquee` is a React marquee component powered by GSAP. It supports horizontal and vertical scrolling, seamless looping, optional fill mode, pause-on-hover, scroll-follow speed changes, draggable interaction, reduced-motion preferences, accessible visual clones, gradient overlays, and TypeScript types.

## Installation

```bash
npm install gsap-react-marquee gsap @gsap/react
```

```bash
yarn add gsap-react-marquee gsap @gsap/react
```

```bash
pnpm add gsap-react-marquee gsap @gsap/react
```

`react`, `gsap`, and `@gsap/react` are peer dependencies and must be installed by the consuming app. Your React application may still use `react-dom`, but this package does not require it directly.

### Compatibility

| Environment | Supported versions | Release verification |
| --- | --- | --- |
| React | 18 and 19 | Packed ESM, CommonJS, types, SSR, CSS, and Chromium fixtures |
| GSAP | 3.12 and 3.13 | Packed fixtures use 3.12.5 and 3.13.0 |
| `@gsap/react` | 2.1 or newer | Packed fixtures use 2.1.2 |
| Node.js | 20 and 22 | Typecheck, lint, unit, build, package, and audit release matrix |

Node.js versions older than 20 are not part of the `0.4.0` support contract.

## Basic Usage

```tsx
import Marquee from "gsap-react-marquee";

export function App() {
  return (
    <Marquee dir="left" speed={100} spacing={16}>
      <span>Scrolling content</span>
    </Marquee>
  );
}
```

The package injects its base CSS through the bundled entrypoint, so no separate stylesheet import is required.

## Examples

### Continuous Fill

Use `fill` when a short piece of content should repeat enough times to cover the visible marquee area.

```tsx
<Marquee fill spacing={24} speed={80}>
  <span>React</span>
  <span>GSAP</span>
  <span>Animation</span>
</Marquee>
```

`fill` is independent from `dir`. It uses the same coverage calculation for
left, right, up, and down movement. Without `fill`, every direction renders one
semantic original and one visual clone.

### Vertical Marquee

```tsx
<Marquee
  dir="up"
  fill
  speed={80}
  spacing={12}
  containerStyle={{ height: 320 }}
>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Marquee>
```

Use `containerStyle` or `containerClassName` when the surrounding layout does
not already provide a constrained height.

### Gradient Overlay

When `gradient` is enabled, the component detects the nearest non-transparent background color and uses it for the edge fade. You can override the color with `gradientColor`.

```tsx
<Marquee gradient gradientColor="#ffffff">
  <span>Faded edges</span>
</Marquee>
```

### Pause On Hover

```tsx
<Marquee pauseOnHover>
  <span>Hover to pause</span>
</Marquee>
```

`pauseOnHover` also pauses while keyboard focus is inside the marquee. Leaving
with either pointer or focus cannot override a controlled `paused={true}`.

### Controlled Pause

`paused` is controlled React state, not only an initial setting. Changing it to
`true` pauses the current direction; changing it to `false` resumes that
direction at the base speed. Hover/focus leave, drag release, scroll response,
reverse delay, and late plugin loading cannot resume `paused={true}`. Draggable
still initializes while controlled-paused so it becomes usable when resumed.

```tsx
<Marquee paused={isPaused} draggable>
  <span>Controlled animation</span>
</Marquee>
```

### Scroll-Follow

`scrollFollow` changes the marquee timeline speed and direction based on vertical wheel movement.

```tsx
<Marquee scrollFollow scrollSpeed={3}>
  <span>Scroll the page or wheel over the document</span>
</Marquee>
```

### Draggable

`draggable` lets users drag the marquee track manually. The package loads `Draggable` only when this prop is enabled. Momentum throwing is enabled when your GSAP setup has already registered `InertiaPlugin`; otherwise direct dragging still works without the inertia throw. This feature detection keeps the package compatible with GSAP 3.12 distributions, which do not all expose `InertiaPlugin` at the same package path.

```tsx
<Marquee draggable pauseOnHover>
  <img src="/image-1.jpg" alt="Gallery image 1" />
  <img src="/image-2.jpg" alt="Gallery image 2" />
  <img src="/image-3.jpg" alt="Gallery image 3" />
</Marquee>
```

### Forwarded Ref

The component forwards a ref to the root marquee container. Both object refs and callback refs are supported.

```tsx
import { useRef } from "react";
import Marquee from "gsap-react-marquee";

export function Example() {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <Marquee ref={ref} fill>
      <span>Measured container</span>
    </Marquee>
  );
}
```

### Reduced Motion

The component respects `prefers-reduced-motion: reduce` by default. It renders
one static original and creates no GSAP timeline, Observer, or Draggable
instance. Preference changes are applied without reloading the page.

Use `respectReducedMotion={false}` only when motion remains appropriate for the
content and audience:

```tsx
<Marquee respectReducedMotion={false}>
  <span>Animation remains enabled</span>
</Marquee>
```

### Accessibility and Child Content

Version `0.4.0` supports presentational children such as text, images, and logo
groups. Interactive controls, links, stable IDs, and ID-reference relationships
inside repeated children are not supported. A future major version may add an
explicit render-item API for interactive content.

SSR output contains only the semantic original. After client measurement,
visual clones receive `aria-hidden="true"`, native `inert` where available, and
disabled pointer interaction. The Safari 14.1 fallback removes clone tab stops,
form names, IDs, and ID-reference attributes and prevents programmatic focus
from remaining inside a clone. Development builds warn once when unsupported
child content is detected.

Clone sanitization means ID-based CSS, fragment links, and SVG references inside
repeated children may not survive. Keep those relationships outside marquee
children.

Use `containerProps` for root semantics and event handlers:

```tsx
<Marquee
  containerProps={{
    "aria-label": "Technology partners",
    role: "region",
  }}
>
  <span>Presentational partner logos</span>
</Marquee>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | Required | Content rendered inside each marquee item. |
| `className` | `string` | `undefined` | Class applied to each `.gsap-react-marquee-content` element. |
| `containerClassName` | `string` | `undefined` | Class applied only to the root viewport. |
| `containerStyle` | `CSSProperties` | `undefined` | Inline styles applied to the root viewport. |
| `containerProps` | root `div` attributes | `undefined` | ARIA, `data-*`, and event props applied to the root viewport. |
| `dir` | `"left" \| "right" \| "up" \| "down"` | `"left"` | Direction of movement. |
| `loop` | `number` | `-1` | Number of timeline repeats. `-1` means infinite. |
| `paused` | `boolean` | `false` | Starts the timeline paused. |
| `respectReducedMotion` | `boolean` | `true` | Shows one static original when reduced motion is requested. |
| `delay` | `number` | `0` | Delay in seconds before the timeline starts. |
| `speed` | `number` | `100` | Animation speed in pixels per second. |
| `fill` | `boolean` | `false` | Repeats content enough times to cover the measured marquee area. |
| `maxDuplicates` | `number` | `100` | Maximum additional clones in fill mode, capped internally at `250`. |
| `pauseOnHover` | `boolean` | `false` | Pauses on pointer hover and resumes on leave. |
| `gradient` | `boolean` | `false` | Enables edge gradient overlays. |
| `gradientColor` | `string` | `undefined` | Explicit gradient color. Overrides automatic background detection. |
| `spacing` | `number` | `16` | Gap between marquee items, in pixels. |
| `draggable` | `boolean` | `false` | Enables manual drag control. |
| `scrollFollow` | `boolean` | `false` | Adjusts timeline speed from wheel/scroll direction. |
| `scrollSpeed` | `number` | `2.5` | Scroll-follow multiplier. Clamped between `1.1` and `4`. |

### Numeric Normalization

Numeric props are normalized before layout or GSAP receives them. Invalid
values never create negative, `NaN`, or infinite durations.

| Prop | Accepted values | Invalid-value behavior |
| --- | --- | --- |
| `speed` | finite number greater than `0` | Uses `100` |
| `spacing` | finite number at least `0` | Uses `16` |
| `delay` | finite number at least `0` | Uses `0` |
| `loop` | `-1` or integer at least `0` | Uses `-1` |
| `scrollSpeed` | finite number | Clamped to `1.1`–`4`; non-finite uses `2.5` |
| `maxDuplicates` | positive integer | Uses `100`, then caps at hard ceiling `250` |

## How Sizing Works

The component renders one semantic original during SSR, then measures the root container and first content item after client mount. It creates enough inaccessible visual clones for the selected mode and starts a GSAP timeline unless reduced motion is active.

In normal mode (`fill={false}`), the component renders one original item plus
one clone. Each repeated wrapper automatically spans at least the active
viewport axis and grows when its natural content is larger. Short vertical
content therefore re-enters from the far edge instead of the middle; `fill` is
not required for correct entry geometry.

In fill mode (`fill={true}`), the component calculates how many clones are required to cover the measured target size plus one seamless wrap segment. The calculation includes `spacing` and behaves identically for horizontal and vertical directions. `maxDuplicates` defaults to `100` and has a hard internal ceiling of `250`. When a configured ceiling prevents full coverage, development builds emit one warning and keep the rendered clone count finite.

Clone calculation uses the root container's measured width or height. The root automatically fills the parent's width in horizontal mode and the parent's width and height in vertical mode. Page layout defines the available viewport; no width or height prop is required on `Marquee`. Clone-generated size changes are excluded from subsequent viewport measurements.

## Styling

The root element receives these classes:

```html
<div class="gsap-react-marquee-container">
  <div class="gsap-react-marquee">
    <div class="gsap-react-marquee-content">...</div>
  </div>
</div>
```

Vertical marquees also receive:

```html
<div class="gsap-react-marquee-container gsap-react-marquee-vertical">
```

Use `className` to style the repeated content wrapper:

```tsx
<Marquee className="items-center gap-4">
  <span>One</span>
  <span>Two</span>
</Marquee>
```

Use `containerClassName` or `containerStyle` only when the automatic viewport
needs an explicit visual or sizing override:

```tsx
<Marquee
  dir="up"
  fill
  containerClassName="vertical-marquee"
  containerStyle={{ height: 320, backgroundColor: "#111827" }}
>
  <span>Measured vertical content</span>
</Marquee>
```

Required root layout styles remain controlled by the component. The root fills
the available parent viewport automatically. Width, height, color, background,
and other non-critical styles can still be overridden through `containerStyle`.

## Runtime Notes

- SSR safely renders one static original. Client measurement adds visual clones after hydration.
- The animated lifecycle uses an isomorphic layout effect, `ResizeObserver`, `requestAnimationFrame`, and DOM measurements.
- In SSR frameworks such as Next.js, render it from a client component. Add `"use client"` to the file that imports and renders the marquee.
- Images that are not complete at mount are watched and trigger a re-measure after `load` or `error`.
- Changing animation props such as `dir`, `speed`, `delay`, `fill`, `maxDuplicates`, `draggable`, `spacing`, `loop`, or `paused` re-initializes the GSAP timeline.
- ESM and CommonJS bundles contain the same minified runtime and inject one minified base-style element in browsers. Importing either entrypoint during SSR does not access `document`.
- Published JavaScript and CSS are minified, while supported development diagnostics remain intact. Source maps are intentionally not published for `0.4.0`; repository TypeScript remains the review/debug source.

## Browser Support

Supported targets are current and previous-major Chromium and Firefox releases,
plus Safari and iOS Safari 14.1 or newer. Native `inert` is feature-detected.
Safari versions without it use the clone-specific focus, form, and pointer
fallback described above. Playwright Chromium and WebKit are the automated
compatibility signals; WebKit does not exactly emulate every older Safari
release.

## Troubleshooting

### The marquee has gaps

Use `fill={true}` for short content, increase `spacing` only as much as needed, and make sure images/fonts have stable dimensions. For image-heavy marquees, set explicit image width and height to reduce layout shifts.

### Vertical marquee does not move correctly

Ensure the surrounding page layout exposes usable vertical space. The marquee
automatically fills that parent space and measures its own root; do not copy the
parent height onto `Marquee`.

### The marquee expands the page

Constrain the surrounding page region with normal CSS layout. The marquee root
automatically consumes that region instead of expanding to the cloned track.

### Dragging has no momentum

Momentum depends on GSAP `InertiaPlugin` availability. If the plugin is not available in your GSAP installation, dragging can still work without inertia-style throwing.

## Development

Use Node.js 20 or 22 and the pinned pnpm version from `packageManager`.

Install the exact lockfile:

```bash
pnpm install --frozen-lockfile
```

Run TypeScript, lint, and unit checks:

```bash
pnpm run check
```

Run browser compatibility checks:

```bash
pnpm run test:browser
pnpm run test:browser:webkit
```

Build and test the real packed artifact against React 18 and 19 consumers:

```bash
pnpm run test:package
```

Run the full dependency audit or complete local release gate:

```bash
pnpm run audit
pnpm run release:check
```

## License

MIT
