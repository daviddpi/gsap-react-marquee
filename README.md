# GSAP React Marquee

`gsap-react-marquee` is a React marquee component powered by GSAP. It supports horizontal and vertical scrolling, seamless looping, optional fill mode, pause-on-hover, scroll-follow speed changes, draggable interaction, gradient overlays, and TypeScript types.

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
<Marquee dir="up" speed={80} spacing={12}>
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

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | Required | Content rendered inside each marquee item. |
| `className` | `string` | `undefined` | Class applied to each `.gsap-react-marquee-content` element. |
| `dir` | `"left" \| "right" \| "up" \| "down"` | `"left"` | Direction of movement. |
| `loop` | `number` | `-1` | Number of timeline repeats. `-1` means infinite. |
| `paused` | `boolean` | `false` | Starts the timeline paused. |
| `delay` | `number` | `0` | Delay in seconds before the timeline starts. |
| `speed` | `number` | `100` | Animation speed in pixels per second. |
| `fill` | `boolean` | `false` | Repeats content enough times to cover the measured marquee area. |
| `pauseOnHover` | `boolean` | `false` | Pauses on pointer hover and resumes on leave. |
| `gradient` | `boolean` | `false` | Enables edge gradient overlays. |
| `gradientColor` | `string` | `undefined` | Explicit gradient color. Overrides automatic background detection. |
| `spacing` | `number` | `16` | Gap between marquee items, in pixels. |
| `draggable` | `boolean` | `false` | Enables manual drag control. |
| `scrollFollow` | `boolean` | `false` | Adjusts timeline speed from wheel/scroll direction. |
| `scrollSpeed` | `number` | `2.5` | Scroll-follow multiplier. Clamped between `1.1` and `4`. |

## How Sizing Works

The component measures the root container and first content item after mount. It then creates enough cloned marquee items for the selected mode and starts a GSAP timeline.

In normal mode (`fill={false}`), the component renders one original item plus one clone. This is suitable when your content is already large enough to create a continuous loop.

In fill mode (`fill={true}`), the component calculates how many clones are required to cover the measured target size. The duplicate count is capped to prevent excessive DOM growth, and the component re-measures when the container, the first content item, child content, or unloaded images change size.

If the container has no reliable defined size, the component falls back to the viewport width or height as its measurement target. This avoids recursive expansion when the marquee is placed inside content-sized layouts.

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

For predictable measurement, give the marquee or its parent a stable width for horizontal marquees and a stable height for vertical marquees.

## Runtime Notes

- The component uses `useLayoutEffect`, `ResizeObserver`, `requestAnimationFrame`, and DOM measurements, so it is intended for client-side rendering.
- In SSR frameworks such as Next.js, render it from a client component. Add `"use client"` to the file that imports and renders the marquee.
- Images that are not complete at mount are watched and trigger a re-measure after `load` or `error`.
- Changing animation props such as `dir`, `speed`, `delay`, `fill`, `draggable`, `spacing`, `loop`, or `paused` re-initializes the GSAP timeline.

## Troubleshooting

### The marquee has gaps

Use `fill={true}` for short content, increase `spacing` only as much as needed, and make sure images/fonts have stable dimensions. For image-heavy marquees, set explicit image width and height to reduce layout shifts.

### Vertical marquee does not move correctly

Give the container or one of its parents a real height. Vertical mode measures height, not width.

### The marquee expands the page

Place it in a container with an explicit width or max width. In fill mode, the component falls back to viewport measurement when it detects content-sized containers, but explicit layout constraints are still more predictable.

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
