import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
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
