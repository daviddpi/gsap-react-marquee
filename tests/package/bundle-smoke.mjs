import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { rollup } from "rollup";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const packageEntry = resolve(repositoryRoot, "dist/index.esm.js").replaceAll(
  "\\",
  "/"
);

const fixtures = {
  default: "{}",
  interactive: "{ draggable: true, scrollFollow: true }",
};

const measurements = {};

const measureVirtualBundle = async (
  source,
  expectedMarker,
  { includeDynamicChunks = true } = {}
) => {
  const build = await rollup({
    external(id) {
      return (
        id === "@gsap/react" || id === "react" || id.startsWith("react/")
      );
    },
    input: "virtual:consumer-entry",
    plugins: [
      {
        load(id) {
          return id === "virtual:consumer-entry" ? source : null;
        },
        name: "virtual-consumer-fixture",
        resolveId(id) {
          return id === "virtual:consumer-entry" ? id : null;
        },
      },
      nodeResolve({ browser: true }),
      commonjs(),
      terser({ format: { comments: false } }),
    ],
    treeshake: true,
  });

  const { output } = await build.generate({
    format: "esm",
  });
  const chunks = output.filter((item) => item.type === "chunk");
  const entryCode = chunks
    .filter((item) => item.isEntry)
    .map((item) => item.code)
    .join("\n");
  const measuredChunks = includeDynamicChunks
    ? chunks
    : chunks.filter((item) => item.isEntry);

  assert.match(entryCode, expectedMarker);
  for (const match of entryCode.matchAll(/NODE_ENV/g)) {
    const environmentAccessIndex = match.index ?? 0;
    const guardWindow = entryCode.slice(
      Math.max(0, environmentAccessIndex - 200),
      environmentAccessIndex
    );
    assert.match(
      guardWindow,
      /typeof [A-Za-z_$][\w$]*/,
      "pure Rollup browser output must guard each NODE_ENV access"
    );
  }
  await build.close();

  return {
    gzipBytes: measuredChunks.reduce(
      (size, item) => size + gzipSync(item.code).byteLength,
      0
    ),
    minifiedBytes: measuredChunks.reduce(
      (size, item) => size + Buffer.byteLength(item.code),
      0
    ),
  };
};

for (const [name, props] of Object.entries(fixtures)) {
  measurements[name] = await measureVirtualBundle(
    `
      import Marquee from "${packageEntry}";
      export const fixture = {
        Component: Marquee,
        props: ${props},
      };
    `,
    /gsap-react-marquee-container/,
    { includeDynamicChunks: name === "interactive" }
  );
}

const gsapCore = await measureVirtualBundle(
  'export { gsap } from "gsap";',
  /Timeline/
);
const gsapWithOptionalPlugins = await measureVirtualBundle(
  `
    export { gsap } from "gsap";
    export { Draggable } from "gsap/Draggable.js";
    export { Observer } from "gsap/Observer.js";
  `,
  /Draggable/
);

measurements.optionalPluginDelta = {
  gzipBytes: gsapWithOptionalPlugins.gzipBytes - gsapCore.gzipBytes,
  minifiedBytes:
    gsapWithOptionalPlugins.minifiedBytes - gsapCore.minifiedBytes,
};

const bundleLimits = {
  default: { gzipBytes: 35_000, minifiedBytes: 90_000 },
  interactive: { gzipBytes: 52_000, minifiedBytes: 135_000 },
};

for (const [name, limits] of Object.entries(bundleLimits)) {
  assert.ok(
    measurements[name].gzipBytes <= limits.gzipBytes,
    `${name} gzip bundle exceeded ${limits.gzipBytes} bytes`
  );
  assert.ok(
    measurements[name].minifiedBytes <= limits.minifiedBytes,
    `${name} minified bundle exceeded ${limits.minifiedBytes} bytes`
  );
}

console.log("Consumer bundle smoke passed:", JSON.stringify(measurements));
