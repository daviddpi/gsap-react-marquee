declare const process:
  | { readonly env: { readonly NODE_ENV?: string } }
  | undefined;

/**
 * Detects production without assuming a Node-style `process` global exists.
 * Bare-browser ESM consumers intentionally keep development diagnostics.
 */
export const isProductionRuntime = (): boolean =>
  typeof process !== "undefined" && process.env.NODE_ENV === "production";
