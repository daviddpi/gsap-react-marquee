import { afterEach, describe, expect, it, vi } from "vitest";
import { isProductionRuntime } from "../../src/components/runtime-diagnostics";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime diagnostics", () => {
  it("is browser-safe when process is absent", () => {
    vi.stubGlobal("process", undefined);

    expect(isProductionRuntime()).toBe(false);
  });

  it("recognizes an explicit production environment", () => {
    vi.stubGlobal("process", { env: { NODE_ENV: "production" } });

    expect(isProductionRuntime()).toBe(true);
  });
});
