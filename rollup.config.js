import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";
import dts from "rollup-plugin-dts";
import postcss from "rollup-plugin-postcss";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: false,
        exports: "named",
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: false,
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist/types",
        declarationMap: false,
        removeComments: true,
      }),
      postcss({
        minimize: true,
        inject: true,
        sourceMap: false,
        extract: false,
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log", "console.warn", "console.error"],
          passes: 2,
        },
        mangle: true,
        format: {
          comments: false,
        },
      }),
    ],
    external: [
      "react",
      "react-dom",
      "gsap",
      "gsap/all",
      "@gsap/react",
      "clsx",
      "tailwind-merge",
    ],
  },
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [
      dts({
        compilerOptions: {
          removeComments: true,
        },
      }),
    ],
    external: [
      /\.css$/,
      "react",
      "gsap",
      "gsap/all",
      "@gsap/react",
      "clsx",
      "tailwind-merge",
    ],
  },
];
