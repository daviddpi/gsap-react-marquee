import { useEffect, useRef, useState } from "react";
import {
  loadDraggablePlugins,
  loadObserverPlugin,
  type MarqueeDraggablePlugins,
  type ObserverPlugin,
  registerDraggablePlugins,
  registerObserverPlugin,
} from "./marquee-plugins";

type UseMarqueePluginsOptions = {
  draggable: boolean;
  scrollFollow: boolean;
};

type LoadedMarqueePlugins = {
  draggable: MarqueeDraggablePlugins | null;
  observer: ObserverPlugin | null;
};

let hasWarnedPluginLoadFailure = false;

const warnPluginLoadFailure = () => {
  if (process.env.NODE_ENV === "production" || hasWarnedPluginLoadFailure) {
    return;
  }

  hasWarnedPluginLoadFailure = true;
  Reflect.apply(console.warn, console, [
    "GSAPReactMarquee: optional GSAP plugins failed to load; the requested interactive feature was not initialized.",
  ]);
};

export const useMarqueePlugins = ({
  draggable,
  scrollFollow,
}: UseMarqueePluginsOptions) => {
  const pluginsRef = useRef<LoadedMarqueePlugins>({
    draggable: null,
    observer: null,
  });
  const [, publishPlugins] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const pendingPlugins: Array<Promise<void>> = [];

    if (scrollFollow && !pluginsRef.current.observer) {
      pendingPlugins.push(
        loadObserverPlugin().then((Observer) => {
          if (!isMounted) return;
          registerObserverPlugin(Observer);
          pluginsRef.current.observer = Observer;
        })
      );
    }

    if (draggable && !pluginsRef.current.draggable) {
      pendingPlugins.push(
        loadDraggablePlugins().then((plugins) => {
          if (!isMounted) return;
          registerDraggablePlugins(plugins);
          pluginsRef.current.draggable = plugins;
        })
      );
    }

    if (pendingPlugins.length > 0) {
      Promise.all(pendingPlugins).then(
        () => {
          if (isMounted) publishPlugins((version) => version + 1);
        },
        () => {
          if (isMounted) warnPluginLoadFailure();
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [draggable, scrollFollow]);

  const pluginsReady =
    (!draggable || pluginsRef.current.draggable !== null) &&
    (!scrollFollow || pluginsRef.current.observer !== null);

  return { pluginsReady, pluginsRef };
};
