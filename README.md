# GSAP React Marquee

A high-performance, customizable React marquee component powered by GSAP animations.

## Installation

```bash
npm install gsap-react-marquee
# or
yarn add gsap-react-marquee
# or
pnpm add gsap-react-marquee
```

## Usage

```tsx
import Marquee from "gsap-react-marquee";

function App() {
  return (
    <Marquee dir="right" speed={100} fill={true} spacing={16}>
      <div>Hello world</div>
    </Marquee>
  );
}
```

## Props

| Prop                 | Type                                  | Default   | Description                                                                             |
| -------------------- | ------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `children`           | `ReactNode`                           | –         | Content to render inside the marquee                                                    |
| `className`          | `string`                              | –         | Additional CSS classes for styling                                                      |
| `dir`                | `"right" \| "left" \| "up" \| "down"` | `"right"` | Direction of the marquee movement                                                       |
| `loop`               | `number`                              | `-1`      | Number of loops (`-1` = infinite)                                                       |
| `paused`             | `boolean`                             | `false`   | Whether the marquee animation should be paused                                          |
| `alignRotationWithY` | `boolean`                             | `false`   | Correctly orients (rotates) the content along Y axis (⚠️ avoid with `"left"`/`"right"`) |
| `delay`              | `number`                              | `0`       | Delay before the animation starts                                                       |
| `speed`              | `number`                              | `100`     | Speed of the marquee animation in px/s                                                  |
| `fill`               | `boolean`                             | `false`   | Whether the marquee should continuously fill the space                                  |
| `pauseOnHover`       | `boolean`                             | `false`   | Pause the marquee when hovering                                                         |
| `gradient`           | `boolean`                             | `false`   | Enable gradient overlay                                                                 |
| `gradientColor`      | `string`                              | –         | Color of the gradient if enabled                                                        |
| `spacing`            | `number`                              | `16`      | Spacing between repeated elements in px                                                 |
| `draggable`          | `boolean`                             | `false`   | Enable dragging to scroll manually                                                      |
| `followScrollDir`    | `boolean`                             | `false`   | Sync marquee with page scroll direction                                                 |
| `scrollSpeed`        | `number`                              | –         | Speed factor when syncing with page scroll                                              |
