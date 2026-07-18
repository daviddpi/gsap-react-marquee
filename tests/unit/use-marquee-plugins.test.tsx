import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
};

const mocks = vi.hoisted(() => ({
  draggableDeferred: undefined as Deferred<object> | undefined,
  loadDraggablePlugins: vi.fn(),
  loadObserverPlugin: vi.fn(),
  observerDeferred: undefined as Deferred<object> | undefined,
  registerDraggablePlugins: vi.fn(),
  registerObserverPlugin: vi.fn(),
}));

vi.mock("../../src/components/marquee-plugins", () => ({
  loadDraggablePlugins: mocks.loadDraggablePlugins,
  loadObserverPlugin: mocks.loadObserverPlugin,
  registerDraggablePlugins: mocks.registerDraggablePlugins,
  registerObserverPlugin: mocks.registerObserverPlugin,
}));

import { useMarqueePlugins } from "../../src/components/use-marquee-plugins";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.draggableDeferred = createDeferred<object>();
  mocks.observerDeferred = createDeferred<object>();
  mocks.loadDraggablePlugins.mockReturnValue(mocks.draggableDeferred.promise);
  mocks.loadObserverPlugin.mockReturnValue(mocks.observerDeferred.promise);
});

describe("useMarqueePlugins", () => {
  it("loads no optional plugin for default usage", () => {
    const { result } = renderHook(() =>
      useMarqueePlugins({ draggable: false, scrollFollow: false })
    );

    expect(result.current.pluginsReady).toBe(true);
    expect(mocks.loadDraggablePlugins).not.toHaveBeenCalled();
    expect(mocks.loadObserverPlugin).not.toHaveBeenCalled();
  });

  it("loads and registers requested interactive plugins", async () => {
    const { result } = renderHook(() =>
      useMarqueePlugins({ draggable: true, scrollFollow: true })
    );

    expect(result.current.pluginsReady).toBe(false);
    expect(mocks.loadDraggablePlugins).toHaveBeenCalledOnce();
    expect(mocks.loadObserverPlugin).toHaveBeenCalledOnce();

    await act(async () => {
      mocks.draggableDeferred?.resolve({ Draggable: {} });
      mocks.observerDeferred?.resolve({ create: vi.fn() });
      await Promise.all([
        mocks.draggableDeferred?.promise,
        mocks.observerDeferred?.promise,
      ]);
    });

    await waitFor(() => expect(result.current.pluginsReady).toBe(true));
    expect(mocks.registerDraggablePlugins).toHaveBeenCalledOnce();
    expect(mocks.registerObserverPlugin).toHaveBeenCalledOnce();
  });

  it("settles failures independently and retries after feature reactivation", async () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { rerender, result } = renderHook(
      ({ draggable, scrollFollow }) =>
        useMarqueePlugins({ draggable, scrollFollow }),
      { initialProps: { draggable: true, scrollFollow: true } }
    );

    await act(async () => {
      mocks.draggableDeferred?.reject(new Error("Draggable chunk failed"));
      mocks.observerDeferred?.reject(new Error("Observer chunk failed"));
      await Promise.allSettled([
        mocks.draggableDeferred?.promise,
        mocks.observerDeferred?.promise,
      ]);
    });

    await waitFor(() => expect(result.current.pluginsReady).toBe(true));
    expect(result.current.pluginStatuses).toEqual({
      draggable: "failed",
      observer: "failed",
    });
    expect(warning).toHaveBeenCalledTimes(2);

    rerender({ draggable: false, scrollFollow: false });
    await waitFor(() =>
      expect(result.current.pluginStatuses).toEqual({
        draggable: "idle",
        observer: "idle",
      })
    );

    mocks.draggableDeferred = createDeferred<object>();
    mocks.observerDeferred = createDeferred<object>();
    mocks.loadDraggablePlugins.mockReturnValue(mocks.draggableDeferred.promise);
    mocks.loadObserverPlugin.mockReturnValue(mocks.observerDeferred.promise);
    rerender({ draggable: true, scrollFollow: true });

    expect(mocks.loadDraggablePlugins).toHaveBeenCalledTimes(2);
    expect(mocks.loadObserverPlugin).toHaveBeenCalledTimes(2);

    await act(async () => {
      mocks.draggableDeferred?.resolve({ Draggable: {} });
      mocks.observerDeferred?.resolve({ create: vi.fn() });
      await Promise.all([
        mocks.draggableDeferred?.promise,
        mocks.observerDeferred?.promise,
      ]);
    });

    await waitFor(() => expect(result.current.pluginsReady).toBe(true));
    expect(result.current.pluginStatuses).toEqual({
      draggable: "ready",
      observer: "ready",
    });
    expect(warning).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });

  it("keeps the successful plugin when the other requested plugin fails", async () => {
    const { result } = renderHook(() =>
      useMarqueePlugins({ draggable: true, scrollFollow: true })
    );

    await act(async () => {
      mocks.draggableDeferred?.reject(new Error("Draggable chunk failed"));
      mocks.observerDeferred?.resolve({ create: vi.fn() });
      await Promise.allSettled([
        mocks.draggableDeferred?.promise,
        mocks.observerDeferred?.promise,
      ]);
    });

    await waitFor(() => expect(result.current.pluginsReady).toBe(true));
    expect(result.current.pluginStatuses).toEqual({
      draggable: "failed",
      observer: "ready",
    });
    expect(mocks.registerDraggablePlugins).not.toHaveBeenCalled();
    expect(mocks.registerObserverPlugin).toHaveBeenCalledOnce();
  });

  it("does not register plugins or publish state after unmount", async () => {
    const { unmount } = renderHook(() =>
      useMarqueePlugins({ draggable: true, scrollFollow: true })
    );
    unmount();

    await act(async () => {
      mocks.draggableDeferred?.resolve({ Draggable: {} });
      mocks.observerDeferred?.resolve({ create: vi.fn() });
      await Promise.all([
        mocks.draggableDeferred?.promise,
        mocks.observerDeferred?.promise,
      ]);
    });

    expect(mocks.registerDraggablePlugins).not.toHaveBeenCalled();
    expect(mocks.registerObserverPlugin).not.toHaveBeenCalled();
  });
});
