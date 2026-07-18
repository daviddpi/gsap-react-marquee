import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  Draggable: Object.assign(function Draggable() {}, { create: vi.fn() }),
  Observer: { create: vi.fn() },
  registerPlugin: vi.fn(),
}));

vi.mock("gsap", () => ({
  gsap: { registerPlugin: mocks.registerPlugin },
}));
vi.mock("gsap/Draggable.js", () => ({ Draggable: mocks.Draggable }));
vi.mock("gsap/Observer.js", () => ({ Observer: mocks.Observer }));

import {
  createRetryablePluginLoader,
  loadDraggablePlugins,
  loadObserverPlugin,
  registerDraggablePlugins,
  registerObserverPlugin,
} from "../../src/components/marquee-plugins";

describe("optional marquee plugin loader", () => {
  it("clears a rejected cached promise so a later call can retry", async () => {
    const importPlugin = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValue("loaded");
    const loadPlugin = createRetryablePluginLoader(importPlugin);

    const firstPromise = loadPlugin();
    expect(loadPlugin()).toBe(firstPromise);
    await expect(firstPromise).rejects.toThrow("chunk failed");

    await expect(loadPlugin()).resolves.toBe("loaded");
    expect(importPlugin).toHaveBeenCalledTimes(2);
  });

  it("caches import promises and registers each plugin group once", async () => {
    const firstObserverPromise = loadObserverPlugin();
    const secondObserverPromise = loadObserverPlugin();
    const firstDraggablePromise = loadDraggablePlugins();
    const secondDraggablePromise = loadDraggablePlugins();

    expect(secondObserverPromise).toBe(firstObserverPromise);
    expect(secondDraggablePromise).toBe(firstDraggablePromise);

    const [Observer, draggablePlugins] = await Promise.all([
      firstObserverPromise,
      firstDraggablePromise,
    ]);
    registerObserverPlugin(Observer);
    registerObserverPlugin(Observer);
    registerDraggablePlugins(draggablePlugins);
    registerDraggablePlugins(draggablePlugins);

    expect(mocks.registerPlugin).toHaveBeenCalledTimes(2);
    expect(mocks.registerPlugin).toHaveBeenNthCalledWith(1, mocks.Observer);
    expect(mocks.registerPlugin).toHaveBeenNthCalledWith(
      2,
      mocks.Draggable
    );
  });
});
