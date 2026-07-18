import type { Draggable } from "gsap/Draggable";
import type { Observer } from "gsap/Observer";
import { gsap } from "gsap";

/** Observer plugin constructor loaded on demand. */
export type ObserverPlugin = typeof Observer;

export type MarqueeDraggablePlugins = {
  Draggable: typeof Draggable;
};

let registeredObserverPlugin: ObserverPlugin | null = null;
let registeredDraggablePlugins: MarqueeDraggablePlugins | null = null;

export const createRetryablePluginLoader = <Plugin>(
  importPlugin: () => Promise<Plugin>
) => {
  let pluginPromise: Promise<Plugin> | null = null;

  return (): Promise<Plugin> => {
    pluginPromise ??= importPlugin().catch((error: unknown) => {
      pluginPromise = null;
      throw error;
    });

    return pluginPromise;
  };
};

export const loadObserverPlugin = createRetryablePluginLoader(
  () => import("gsap/Observer.js").then(({ Observer }) => Observer)
);

export const loadDraggablePlugins = createRetryablePluginLoader(
  () => import("gsap/Draggable.js").then(({ Draggable }) => ({ Draggable }))
);

export const registerObserverPlugin = (Observer: ObserverPlugin): void => {
  if (registeredObserverPlugin === Observer) return;
  gsap.registerPlugin(Observer);
  registeredObserverPlugin = Observer;
};

export const registerDraggablePlugins = (
  plugins: MarqueeDraggablePlugins
): void => {
  if (registeredDraggablePlugins === plugins) return;
  gsap.registerPlugin(plugins.Draggable);
  registeredDraggablePlugins = plugins;
};
