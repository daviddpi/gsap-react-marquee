import type { Draggable } from "gsap/Draggable";
import type { Observer } from "gsap/Observer";
import { gsap } from "gsap";

export type ObserverPlugin = typeof Observer;

export type MarqueeDraggablePlugins = {
  Draggable: typeof Draggable;
};

let observerPluginPromise: Promise<ObserverPlugin> | null = null;
let draggablePluginPromise: Promise<MarqueeDraggablePlugins> | null = null;
let registeredObserverPlugin: ObserverPlugin | null = null;
let registeredDraggablePlugins: MarqueeDraggablePlugins | null = null;

export const loadObserverPlugin = (): Promise<ObserverPlugin> => {
  observerPluginPromise ??= import("gsap/Observer.js").then(
    ({ Observer }) => Observer
  );
  return observerPluginPromise;
};

export const loadDraggablePlugins = (): Promise<MarqueeDraggablePlugins> => {
  draggablePluginPromise ??= import("gsap/Draggable.js").then(
    ({ Draggable }) => ({ Draggable })
  );
  return draggablePluginPromise;
};

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
