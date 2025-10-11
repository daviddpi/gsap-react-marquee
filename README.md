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
    <Marquee dir="left" speed={100} fill={true} spacing={16}>
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
- **Multiple Directions**: Support for horizontal (left/right) and vertical (up/down) scrolling with proper axis handling
- **Smart Gradient Overlays**: Automatic gradient positioning based on marquee orientation
- **Interactive Controls**: Optional draggable interface and scroll synchronization
- **TypeScript Support**: Full type safety and IntelliSense support

## Props

| Prop            | Type                                  | Default  | Description                                                   |
| --------------- | ------------------------------------- | -------- | ------------------------------------------------------------- |
| `children`      | `ReactNode`                           | –        | Content to render inside the marquee                          |
| `className`     | `string`                              | –        | Additional CSS classes for styling                            |
| `dir`           | `"right" \| "left" \| "up" \| "down"` | `"left"` | Direction of the marquee movement                             |
| `loop`          | `number`                              | `-1`     | Number of loops (`-1` = infinite)                             |
| `paused`        | `boolean`                             | `false`  | Whether the marquee animation should be paused                |
| `delay`         | `number`                              | `0`      | Delay before the animation starts (in seconds)                |
| `speed`         | `number`                              | `100`    | Speed of the marquee animation in px/s                        |
| `fill`          | `boolean`                             | `false`  | Whether the marquee should continuously fill the space        |
| `pauseOnHover`  | `boolean`                             | `false`  | Pause the marquee when hovering                               |
| `gradient`      | `boolean`                             | `false`  | Enable gradient overlay (auto-adapts to orientation)          |
| `gradientColor` | `string`                              | –        | Color of the gradient if enabled                              |
| `spacing`       | `number`                              | `16`     | Spacing between repeated elements in px                       |
| `draggable`     | `boolean`                             | `false`  | Enable dragging to scroll manually                            |
| `scrollFollow`  | `boolean`                             | `false`  | Sync marquee with page scroll direction                       |
| `scrollSpeed`   | `number`                              | `2.5`    | Speed factor when syncing with page scroll (max: 4, min: 1.1) |

## Advanced Features

### Intelligent Container Detection

The component automatically detects container dimensions to prevent recursive expansion:

- **Fixed Width Containers**: Uses container dimensions for optimal duplicate calculation
- **Auto-Width Containers**: Falls back to viewport dimensions to prevent layout loops
- **Safety Limits**: Maximum of 15 duplicates to prevent performance issues
- **Development Logging**: Debug information in development mode

### Seamless Looping Algorithm

Enhanced duplicate calculation ensures perfect infinite scrolling:

- **Smart Target Size**: Intelligently determines the space to fill (width for horizontal, height for vertical)
- **Gap Prevention**: Calculates exact duplicates needed to eliminate visual gaps
- **Performance Optimized**: Minimal DOM elements for maximum performance

### Orientation-Aware Animations

The marquee automatically adapts its animation system based on direction:

- **Horizontal (`left`/`right`)**: Uses `xPercent` for X-axis animations with `flexDirection: row`
- **Vertical (`up`/`down`)**: Uses `yPercent` for Y-axis animations with `flexDirection: column`
- **Smart Gradients**: Gradient overlays automatically position themselves based on scroll direction
  - Horizontal: Side gradients (left and right edges)
  - Vertical: Top and bottom gradients

### Interactive Features

- **Draggable Support**: Drag to manually control the marquee position
- **Scroll Synchronization**: Link marquee speed to page scroll direction
- **Pause on Hover**: Temporarily stop animation when hovering
- **Inertia Scrolling**: Smooth momentum-based scrolling when dragging (requires GSAP InertiaPlugin)

## Examples

### Basic Marquee

```tsx
<Marquee dir="left" speed={50}>
  <span>Scrolling text goes here</span>
</Marquee>
```

### Vertical Marquee with Gradient

```tsx
<Marquee dir="up" speed={80} gradient={true} gradient>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Marquee>
```

### Interactive Draggable Marquee

```tsx
<Marquee dir="right" speed={100} draggable={true} pauseOnHover={true}>
  <img src="image1.jpg" alt="1" />
  <img src="image2.jpg" alt="2" />
  <img src="image3.jpg" alt="3" />
</Marquee>
```

### Scroll-Synced Marquee

```tsx
<Marquee dir="left" speed={120} scrollFollow={true} scrollSpeed={3}>
  <div>Scroll the page to see the effect</div>
</Marquee>
```

## Changelog

### v0.3.0

- 🎨 **BREAKING**: Removed `alignVertical` prop - vertical marquees now use native flex-column layout
- ✨ Added proper Y-axis animations for vertical directions (`up`/`down`)
- 🎨 Smart gradient overlays that auto-adapt to marquee orientation
- 🔧 Refactored animation engine to support both X and Y axis seamlessly
- 📊 Improved dimension calculations for vertical marquees

### v0.2.4

- ✨ Added intelligent container detection to prevent recursive expansion
- 🚀 Enhanced duplicate calculation algorithm for better performance
- 🔧 Improved seamless looping with smarter target width calculation
- 📝 Added comprehensive debug logging for development
- 🛡️ Added safety limits to prevent extreme duplicate scenarios
