import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { access, readdir } from "node:fs/promises";
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

assert.deepEqual(
  (await readdir(resolve(repositoryRoot, "dist"))).sort(),
  ["index.cjs", "index.d.ts", "index.esm.js"],
  "clean build must produce only the three intended dist artifacts"
);

const esmSource = readFileSync(
  resolve(repositoryRoot, packageJson.module),
  "utf8"
);
assert.match(
  esmSource,
  /maxDuplicates=.*prevents full fill coverage/,
  "supported duplicate-limit diagnostics must remain in production output"
);
assert.match(
  esmSource,
  /presentational children only/,
  "supported child-content diagnostics must remain in production output"
);
assert.match(
  esmSource,
  /typeof process&&"production"===process\.env\.NODE_ENV/,
  "published ESM must guard process.env with typeof process"
);
assert.doesNotMatch(
  esmSource,
  /gsap\/all\.js/,
  "the package must use direct GSAP plugin modules"
);
assert.match(
  esmSource,
  /gsap-react-marquee-styles/,
  "the browser bundle must contain the guarded CSS injector"
);

const declarationSource = readFileSync(
  resolve(repositoryRoot, packageJson.types),
  "utf8"
);
for (const prop of [
  "containerClassName",
  "containerStyle",
  "containerProps",
  "maxDuplicates",
  "paused",
  "respectReducedMotion",
]) {
  assert.match(
    declarationSource,
    new RegExp(`\\b${prop}\\??:`),
    `generated declarations must contain ${prop}`
  );
}

const esmExports = await import("gsap-react-marquee");
const cjsExports = require("gsap-react-marquee");

assert.deepEqual(
  Object.keys(esmExports).sort(),
  Object.keys(cjsExports).sort(),
  "ESM and CommonJS entrypoints must expose the same public names"
);
assert.deepEqual(Object.keys(esmExports).sort(), [
  "calculateDuplicateCount",
  "calculateDuplicateCountResult",
  "calculateDuplicates",
  "cn",
  "coreAnimation",
  "createMarqueeAnimation",
  "default",
  "getEffectiveBackgroundColor",
  "getMinSize",
  "getMinWidth",
  "getTargetSize",
  "getTargetWidth",
  "hasDefinedWidth",
  "hasUsableMeasurement",
  "normalizeMarqueeOptions",
  "resumeTimeline",
  "setupContainerStyles",
]);
assert.equal(
  esmExports.calculateDuplicates,
  esmExports.calculateDuplicateCount,
  "calculateDuplicates must remain an identity alias"
);
assert.equal(
  esmExports.getTargetWidth,
  esmExports.getTargetSize,
  "getTargetWidth must remain an identity alias"
);
assert.equal(
  esmExports.getMinWidth,
  esmExports.getMinSize,
  "getMinWidth must remain an identity alias"
);
assert.equal(
  esmExports.coreAnimation,
  esmExports.createMarqueeAnimation,
  "coreAnimation must remain an identity alias"
);
assert.equal(typeof esmExports.default, "object");
assert.equal(typeof esmExports.calculateDuplicateCount, "function");
assert.equal(typeof esmExports.hasUsableMeasurement, "function");
assert.equal(typeof esmExports.normalizeMarqueeOptions, "function");

const serverWarnings = [];
const originalConsoleError = console.error;
console.error = (...messages) => serverWarnings.push(messages.join(" "));
let markup;
try {
  markup = renderToStaticMarkup(
    React.createElement(
      esmExports.default,
      null,
      React.createElement("span", { id: "ssr-package-content" }, "SSR package smoke")
    )
  );
} finally {
  console.error = originalConsoleError;
}
assert.match(markup, /SSR package smoke/);
assert.match(markup, /gsap-react-marquee-container/);
assert.equal(
  (markup.match(/id="ssr-package-content"/g) ?? []).length,
  1,
  "SSR output must contain one semantic original"
);
assert.equal(serverWarnings.length, 0, "SSR render must not emit warnings");

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

console.log(
  "Package smoke tests passed: ESM, CJS, types, SSR, CSS guard, dist files"
);
