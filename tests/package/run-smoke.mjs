import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../..");
const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8")
);

await Promise.all(
  [packageJson.main, packageJson.module, packageJson.types].map((file) =>
    access(resolve(repositoryRoot, file))
  )
);

const esmExports = await import("gsap-react-marquee");
const cjsExports = require("gsap-react-marquee");

assert.deepEqual(
  Object.keys(esmExports).sort(),
  Object.keys(cjsExports).sort(),
  "ESM and CommonJS entrypoints must expose the same public names"
);
assert.equal(typeof esmExports.default, "object");
assert.equal(typeof esmExports.calculateDuplicateCount, "function");
assert.equal(typeof esmExports.hasUsableMeasurement, "function");
assert.equal(typeof esmExports.normalizeMarqueeOptions, "function");

const markup = renderToStaticMarkup(
  React.createElement(
    esmExports.default,
    null,
    React.createElement("span", null, "SSR package smoke")
  )
);
assert.match(markup, /SSR package smoke/);
assert.match(markup, /gsap-react-marquee-container/);

const tscPath = require.resolve("typescript/bin/tsc");
const typecheck = spawnSync(
  process.execPath,
  [tscPath, "-p", resolve(testDirectory, "tsconfig.json")],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
  }
);

if (typecheck.status !== 0) {
  process.stderr.write(typecheck.stdout);
  process.stderr.write(typecheck.stderr);
  process.exit(typecheck.status ?? 1);
}

console.log("Package smoke tests passed: ESM, CJS, types, SSR, dist files");
