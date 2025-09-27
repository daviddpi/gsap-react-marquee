# GSAP React Marquee

A high-performance React marquee component powered by GSAP animations with intelligent container detection and seamless looping.

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

## Features

- **Intelligent Container Detection**: Automatically detects whether containers have fixed dimensions or adapt to content, preventing recursive expansion loops
- **Seamless Looping**: Advanced duplicate calculation ensures smooth infinite scrolling without gaps
- **High Performance**: Built with GSAP for optimal animation performance
- **Responsive Design**: Adapts to different screen sizes and container dimensions
- **Multiple Directions**: Support for horizontal (left/right) and vertical (up/down) scrolling
- **Interactive Controls**: Optional draggable interface and scroll synchronization
- **TypeScript Support**: Full type safety and IntelliSense support

## Props

| Prop                 | Type                                  | Default  | Description                                                                             |
| -------------------- | ------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `children`           | `ReactNode`                           | –        | Content to render inside the marquee                                                    |
| `className`          | `string`                              | –        | Additional CSS classes for styling                                                      |
| `dir`                | `"right" \| "left" \| "up" \| "down"` | `"left"` | Direction of the marquee movement                                                       |
| `loop`               | `number`                              | `-1`     | Number of loops (`-1` = infinite)                                                       |
| `paused`             | `boolean`                             | `false`  | Whether the marquee animation should be paused                                          |
| `alignRotationWithY` | `boolean`                             | `false`  | Correctly orients (rotates) the content along Y axis (⚠️ avoid with `"left"`/`"right"`) |
| `delay`              | `number`                              | `0`      | Delay before the animation starts                                                       |
| `speed`              | `number`                              | `100`    | Speed of the marquee animation in px/s                                                  |
| `fill`               | `boolean`                             | `false`  | Whether the marquee should continuously fill the space                                  |
| `pauseOnHover`       | `boolean`                             | `false`  | Pause the marquee when hovering                                                         |
| `gradient`           | `boolean`                             | `false`  | Enable gradient overlay                                                                 |
| `gradientColor`      | `string`                              | –        | Color of the gradient if enabled                                                        |
| `spacing`            | `number`                              | `16`     | Spacing between repeated elements in px                                                 |
| `draggable`          | `boolean`                             | `false`  | Enable dragging to scroll manually                                                      |
| `followScrollDir`    | `boolean`                             | `false`  | Sync marquee with page scroll direction                                                 |
| `scrollSpeed`        | `number`                              | `2.5`    | Speed factor when syncing with page scroll                                              |

## Advanced Features

### Intelligent Container Detection

The component now automatically detects container dimensions to prevent recursive expansion:

- **Fixed Width Containers**: Uses container dimensions for optimal duplicate calculation
- **Auto-Width Containers**: Falls back to viewport dimensions to prevent layout loops
- **Safety Limits**: Maximum of 15 duplicates to prevent performance issues
- **Development Logging**: Debug information in development mode

### Seamless Looping Algorithm

Enhanced duplicate calculation ensures perfect infinite scrolling:

- **Smart Target Width**: Intelligently determines the space to fill
- **Gap Prevention**: Calculates exact duplicates needed to eliminate visual gaps
- **Performance Optimized**: Minimal DOM elements for maximum performance

## Changelog

### v0.2.4

- ✨ Added intelligent container detection to prevent recursive expansion
- 🚀 Enhanced duplicate calculation algorithm for better performance
- 🔧 Improved seamless looping with smarter target width calculation
- 📝 Added comprehensive debug logging for development
- 🛡️ Added safety limits to prevent extreme duplicate scenarios
