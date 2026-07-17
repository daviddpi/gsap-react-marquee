import { transform } from "lightningcss";

const STYLE_ELEMENT_ID = "gsap-react-marquee-styles";

/**
 * Compile imported CSS and inject it once when a browser evaluates the bundle.
 * The document guard keeps ESM and CommonJS imports safe during SSR.
 */
export const cssInject = () => ({
  name: "gsap-react-marquee-css-inject",
  transform(source, id) {
    if (!id.endsWith(".css")) return null;

    const { code } = transform({
      code: Buffer.from(source),
      filename: id,
      minify: true,
      sourceMap: false,
    });
    const css = Buffer.from(code).toString("utf8");

    return {
      code: `
const css = ${JSON.stringify(css)};

if (typeof document !== "undefined" && !document.getElementById(${JSON.stringify(STYLE_ELEMENT_ID)})) {
  const style = document.createElement("style");
  style.id = ${JSON.stringify(STYLE_ELEMENT_ID)};
  style.textContent = css;
  document.head.appendChild(style);
}

export default css;
`,
      map: { mappings: "" },
    };
  },
});
