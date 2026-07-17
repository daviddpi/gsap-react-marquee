# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Changed

- Reordered package export conditions so TypeScript resolves the declaration
  entry point before runtime entries.
- Updated repository ignore rules for generated test and package artifacts.
- Invalid `speed`, `spacing`, `delay`, `scrollSpeed`, and `loop` values now use
  documented finite fallbacks before reaching GSAP.
- Timeline and drag initialization now wait for finite positive measurements;
  invalid geometry cannot create negative or non-finite animation durations.

### Notes

- Milestone 0 changes verification infrastructure only; marquee runtime behavior
  is unchanged.
- GitHub Actions is intentionally not used. Node.js 20 is the verified Milestone
  0 baseline; Node.js 22 remains part of the manual `0.4.0` release matrix.
- Numeric normalization is intentionally silent and does not emit repeated
  runtime warnings.

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
