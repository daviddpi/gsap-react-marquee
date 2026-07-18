# Verification Baseline

## Supported environments

- Node.js 20 as the Milestone 0 local baseline.
- Node.js 22 as an additional manual compatibility target before `0.4.0`.
- React 18 and 19 through the declared peer dependency range.
- Current Chromium and Firefox releases, plus their previous major release.
- Safari and iOS Safari 14.1 or newer.

Chromium is the primary browser test target. Playwright WebKit is a required
local compatibility signal for Safari-facing behavior, but it does not exactly
emulate an old Safari release. Safari 14.1 does not provide native `inert`;
the browser suite therefore forces and tests the documented no-native-`inert`
fallback independently from the native path.

## Test layers

- `pnpm run check`: TypeScript, ESLint, and Vitest unit/rendering tests.
- `pnpm run test:browser`: Chromium layout and animation baseline.
- `pnpm run test:browser:firefox`: Firefox compatibility baseline.
- `pnpm run test:browser:webkit`: WebKit compatibility baseline.
- `pnpm run test:package`: build plus repository export checks, consumer bundle
  budgets, and a real packed-tarball install under React 18/GSAP 3.12 and React
  19/GSAP 3.13. Packed fixtures verify ESM, CommonJS, types, SSR, CSS injection,
  file allowlisting, and Chromium animation.
  React 18 uses TypeScript 5.5.2; React 19 uses the current TypeScript fixture.
  Consumer bundles use pure Rollup without environment replacement and reject
  unprotected browser `process.env` access.

Browser assertions use stable DOM state, dimensions, and GSAP durations. They do
not use frame-perfect animation screenshots.

## Local merge gate

GitHub Actions is intentionally not used. Before merging any milestone, run:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:browser
pnpm run test:browser:firefox
pnpm run test:browser:webkit
pnpm run test:package
```

The package command creates isolated real consumers in the system temporary
directory and removes them after the checks finish.
