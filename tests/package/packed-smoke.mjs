import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../..");
const npmCommand = "npm";
const npmSpawnOptions =
  process.platform === "win32" ? { shell: true } : {};
const vitePath = join(dirname(require.resolve("vite/package.json")), "bin/vite.js");
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "gsap-react-marquee-packed-")
);

const fixtures = [
  {
    name: "react18",
    port: 4188,
    react: "18.3.1",
    reactTypes: "18.3.24",
    reactDomTypes: "18.3.7",
    gsap: "3.12.5",
  },
  {
    name: "react19",
    port: 4189,
    react: "19.2.7",
    reactTypes: "19.2.17",
    reactDomTypes: "19.2.3",
    gsap: "3.13.0",
  },
];

const run = (command, args, options = {}) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      encoding: "utf8",
      stdio: "pipe",
      ...options,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise({ stderr, stdout });
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code}\n${stdout}\n${stderr}`
        )
      );
    });
  });

const writeFixtureSources = async (fixtureDirectory, expectedReactVersion) => {
  const expectedMajor = expectedReactVersion.split(".")[0];
  const sharedSsrAssertions = `
assert.equal(React.version, ${JSON.stringify(expectedReactVersion)});
const warnings = [];
const originalError = console.error;
console.error = (...messages) => warnings.push(messages.join(" "));
let markup;
try {
  markup = renderToStaticMarkup(
    React.createElement(
      Marquee,
      { containerProps: { "aria-label": "Packed SSR marquee" } },
      React.createElement("span", { id: "packed-ssr-content" }, "Packed SSR")
    )
  );
} finally {
  console.error = originalError;
}
assert.match(markup, /Packed SSR/);
assert.match(markup, /aria-label="Packed SSR marquee"/);
assert.equal((markup.match(/id="packed-ssr-content"/g) ?? []).length, 1);
assert.equal(warnings.length, 0);
`;

  await Promise.all([
    writeFile(
      join(fixtureDirectory, "ssr.mjs"),
      `
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Marquee from "gsap-react-marquee";
${sharedSsrAssertions}
`,
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "ssr.cjs"),
      `
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Marquee = require("gsap-react-marquee").default;
${sharedSsrAssertions}
`,
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "esm-css.mjs"),
      `
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;

const packageExports = await import("gsap-react-marquee");
assert.equal(typeof packageExports.normalizeMarqueeOptions, "function");
const style = document.getElementById("gsap-react-marquee-styles");
assert.ok(style);
assert.match(style.textContent, /gsap-react-marquee-container/);
await import("gsap-react-marquee");
assert.equal(document.querySelectorAll("#gsap-react-marquee-styles").length, 1);
`,
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "cjs-css.cjs"),
      `
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const packageExports = require("gsap-react-marquee");
assert.equal(typeof packageExports.normalizeMarqueeOptions, "function");
const style = document.getElementById("gsap-react-marquee-styles");
assert.ok(style);
assert.match(style.textContent, /gsap-react-marquee-container/);
require("gsap-react-marquee");
assert.equal(document.querySelectorAll("#gsap-react-marquee-styles").length, 1);
`,
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "types-smoke.tsx"),
      `
import Marquee, {
  normalizeMarqueeOptions,
  type GSAPReactMarqueeProps,
} from "gsap-react-marquee";

const props: GSAPReactMarqueeProps = {
  children: "typed child",
  className: "content",
  containerClassName: "viewport",
  containerStyle: { height: 240 },
  containerProps: { "aria-label": "Typed marquee", "data-version": ${JSON.stringify(expectedMajor)} },
  dir: "up",
  loop: 2,
  paused: true,
  respectReducedMotion: true,
  delay: 0,
  speed: 120,
  fill: true,
  maxDuplicates: 40,
  pauseOnHover: true,
  gradient: true,
  gradientColor: "#000",
  spacing: 12,
  draggable: true,
  scrollFollow: true,
  scrollSpeed: 3,
};

normalizeMarqueeOptions(props);
void Marquee;
`,
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            jsx: "react-jsx",
            module: "Node16",
            moduleResolution: "Node16",
            noEmit: true,
            skipLibCheck: false,
            strict: true,
            target: "ES2020",
          },
          include: ["types-smoke.tsx"],
        },
        null,
        2
      ),
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "index.html"),
      '<!doctype html><html><head><meta charset="UTF-8"></head><body><div id="root"></div><script type="module" src="/browser.js"></script></body></html>',
      "utf8"
    ),
    writeFile(
      join(fixtureDirectory, "browser.js"),
      `
import React from "react";
import { createRoot } from "react-dom/client";
import Marquee from "gsap-react-marquee";

document.body.style.margin = "0";
const rootElement = document.getElementById("root");
rootElement.style.width = "360px";
rootElement.style.height = "120px";
createRoot(rootElement).render(
  React.createElement(
    Marquee,
    { fill: true, speed: 160, spacing: 8 },
    React.createElement("span", null, "Packed browser animation")
  )
);
window.__packedReactVersion = React.version;
`,
      "utf8"
    ),
  ]);
};

const prepareFixture = async (fixture, tarballPath) => {
  const fixtureDirectory = join(temporaryRoot, fixture.name);
  await mkdir(fixtureDirectory, { recursive: true });
  await copyFile(tarballPath, join(fixtureDirectory, "package.tgz"));
  await writeFile(
    join(fixtureDirectory, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          "@gsap/react": "2.1.2",
          "@types/react": fixture.reactTypes,
          "@types/react-dom": fixture.reactDomTypes,
          "gsap-react-marquee": "file:./package.tgz",
          gsap: fixture.gsap,
          jsdom: "29.1.1",
          react: fixture.react,
          "react-dom": fixture.react,
          typescript: "5.9.2",
          vite: "8.1.5",
        },
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFixtureSources(fixtureDirectory, fixture.react);
  await run(
    npmCommand,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: fixtureDirectory, ...npmSpawnOptions }
  );

  return { ...fixture, directory: fixtureDirectory };
};

const runFixtureChecks = async (fixture) => {
  const tscPath = join(
    fixture.directory,
    "node_modules",
    "typescript",
    "bin",
    "tsc"
  );
  await Promise.all([
    run(process.execPath, [join(fixture.directory, "ssr.mjs")], {
      cwd: fixture.directory,
    }),
    run(process.execPath, [join(fixture.directory, "ssr.cjs")], {
      cwd: fixture.directory,
    }),
    run(process.execPath, [join(fixture.directory, "esm-css.mjs")], {
      cwd: fixture.directory,
    }),
    run(process.execPath, [join(fixture.directory, "cjs-css.cjs")], {
      cwd: fixture.directory,
    }),
    run(process.execPath, [tscPath, "-p", fixture.directory], {
      cwd: fixture.directory,
    }),
  ]);
};

const waitForServer = async (url, server, output) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before startup:\n${output()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Timed out waiting for ${url}\n${output()}`);
};

const runBrowserCheck = async (browser, fixture) => {
  let output = "";
  const server = spawn(
    process.execPath,
    [
      vitePath,
      "--host",
      "127.0.0.1",
      "--port",
      String(fixture.port),
      "--strictPort",
    ],
    { cwd: fixture.directory, stdio: "pipe" }
  );
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });

  const url = `http://127.0.0.1:${fixture.port}`;
  try {
    await waitForServer(url, server, () => output);
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(url);
    await page.waitForSelector(".gsap-react-marquee-container");
    await page.waitForFunction(
      () => document.querySelectorAll(".gsap-react-marquee").length >= 2
    );
    assert.equal(await page.evaluate(() => window.__packedReactVersion), fixture.react);
    assert.equal(
      await page.locator("#gsap-react-marquee-styles").count(),
      1,
      `${fixture.name} must inject CSS once`
    );
    await page.waitForFunction(() => {
      const element = document.querySelector(
        ".gsap-react-marquee-content"
      );
      return element && getComputedStyle(element).transform !== "none";
    });
    const track = page.locator(".gsap-react-marquee-content").first();
    const firstTransform = await track.evaluate(
      (element) => getComputedStyle(element).transform
    );
    await page.waitForTimeout(250);
    const secondTransform = await track.evaluate(
      (element) => getComputedStyle(element).transform
    );
    assert.notEqual(
      firstTransform,
      secondTransform,
      `${fixture.name} browser animation must advance`
    );
    assert.deepEqual(pageErrors, []);
    await page.close();
  } finally {
    server.kill();
  }
};

try {
  const pack = spawnSync(
    npmCommand,
    ["pack", "--json", "--pack-destination", temporaryRoot],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      ...npmSpawnOptions,
    }
  );
  if (pack.error) throw pack.error;
  if (pack.status !== 0) {
    process.stderr.write(pack.stdout ?? "");
    process.stderr.write(pack.stderr ?? "");
    process.exit(pack.status ?? 1);
  }

  const jsonMatch = pack.stdout.match(/(\[\s*\{[\s\S]*\}\s*\])\s*$/);
  assert.ok(jsonMatch, `npm pack did not return JSON metadata:\n${pack.stdout}`);
  const [packMetadata] = JSON.parse(jsonMatch[1]);
  const packedFiles = packMetadata.files.map(({ path }) => path).sort();
  assert.deepEqual(packedFiles, [
    "LICENSE",
    "README.md",
    "dist/index.cjs",
    "dist/index.d.ts",
    "dist/index.esm.js",
    "package.json",
  ]);

  const tarballPath = join(temporaryRoot, packMetadata.filename);
  const preparedFixtures = await Promise.all(
    fixtures.map((fixture) => prepareFixture(fixture, tarballPath))
  );
  await Promise.all(preparedFixtures.map(runFixtureChecks));

  const browser = await chromium.launch();
  try {
    await Promise.all(
      preparedFixtures.map((fixture) => runBrowserCheck(browser, fixture))
    );
  } finally {
    await browser.close();
  }

  console.log(
    "Packed consumer smoke passed: files, React 18/19, GSAP 3.12/3.13, ESM, CJS, types, SSR, CSS, Chromium"
  );
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const resolvedSystemTemp = `${resolve(tmpdir())}${sep}`;
  assert.ok(
    `${resolvedTemporaryRoot}${sep}`.startsWith(resolvedSystemTemp),
    "Refusing to remove a directory outside the system temp root"
  );
  await rm(resolvedTemporaryRoot, { force: true, recursive: true });
}
