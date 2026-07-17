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

`react`, `react-dom`, `gsap`, and `@gsap/react` are peer dependencies and must be installed by the consuming app.

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

### Scroll-Follow

`scrollFollow` changes the marquee timeline speed and direction based on vertical wheel movement.

```tsx
<Marquee scrollFollow scrollSpeed={3}>
  <span>Scroll the page or wheel over the document</span>
</Marquee>
```

### Draggable

`draggable` lets users drag the marquee track manually. Momentum throwing uses GSAP's `InertiaPlugin`. The package imports the plugin from `gsap/all.js`; if your GSAP setup does not include access to InertiaPlugin, dragging still initializes but momentum behavior may be limited by GSAP availability.

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

## How Sizing Works

The component renders one semantic original during SSR, then measures the root container and first content item after client mount. It creates enough inaccessible visual clones for the selected mode and starts a GSAP timeline unless reduced motion is active.

In normal mode (`fill={false}`), the component renders one original item plus one clone. This is suitable when your content is already large enough to create a continuous loop.

In fill mode (`fill={true}`), the component calculates how many clones are required to cover the measured target size plus one seamless wrap segment. The calculation includes `spacing` and behaves identically for horizontal and vertical directions. `maxDuplicates` defaults to `100` and has a hard internal ceiling of `250`. When a configured ceiling prevents full coverage, development builds emit one warning and keep the rendered clone count finite.

Clone calculation uses the root container's measured width or height. For predictable vertical fill, provide an explicit root height with `containerStyle`, `containerClassName`, or a constrained parent. Clone-generated size changes are excluded from subsequent viewport measurements.

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

Use `containerClassName` or `containerStyle` for the root viewport:

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

Required root layout styles remain controlled by the component. Width, height, color, background, and other non-critical viewport styles can be supplied through `containerStyle`. For predictable measurement, give horizontal marquees a stable width and vertical marquees a stable height.

## Runtime Notes

- SSR safely renders one static original. Client measurement adds visual clones after hydration.
- The animated lifecycle uses an isomorphic layout effect, `ResizeObserver`, `requestAnimationFrame`, and DOM measurements.
- In SSR frameworks such as Next.js, render it from a client component. Add `"use client"` to the file that imports and renders the marquee.
- Images that are not complete at mount are watched and trigger a re-measure after `load` or `error`.
- Changing animation props such as `dir`, `speed`, `delay`, `fill`, `maxDuplicates`, `draggable`, `spacing`, `loop`, or `paused` re-initializes the GSAP timeline.

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

Give the container or one of its parents a real height. Vertical mode measures height, not width.

### The marquee expands the page

Place it in a container with an explicit width or max width. For vertical fill, set an explicit height on the root or its layout chain. Content-sized roots intentionally measure their current size instead of inferring an authored CSS constraint from computed pixel values.

### Dragging has no momentum

Momentum depends on GSAP `InertiaPlugin` availability. If the plugin is not available in your GSAP installation, dragging can still work without inertia-style throwing.

## Development

Install dependencies:

```bash
pnpm install
```

Run a TypeScript check:

```bash
pnpm exec tsc --noEmit
```

Build the package:

```bash
pnpm run build
```

Preview the published package contents:

```bash
npm pack --dry-run
```

## License

MIT
