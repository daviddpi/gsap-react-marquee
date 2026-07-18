import { useEffect, useRef, useState } from "react";
import {
  loadDraggablePlugins,
  loadObserverPlugin,
  type MarqueeDraggablePlugins,
  type ObserverPlugin,
  registerDraggablePlugins,
  registerObserverPlugin,
} from "../utils/marquee-plugins";
import { isProductionRuntime } from "../utils/runtime-diagnostics";

type UseMarqueePluginsOptions = {
  draggable: boolean;
  scrollFollow: boolean;
};

type LoadedMarqueePlugins = {
  draggable: MarqueeDraggablePlugins | null;
  observer: ObserverPlugin | null;
};

export type PluginStatus = "idle" | "loading" | "ready" | "failed";

type MarqueePluginStatuses = {
  draggable: PluginStatus;
  observer: PluginStatus;
};

type MarqueePluginName = keyof MarqueePluginStatuses;

const warnedPluginLoadFailures = new Set<MarqueePluginName>();

const warnPluginLoadFailure = (pluginName: MarqueePluginName) => {
  if (
    isProductionRuntime() ||
    warnedPluginLoadFailures.has(pluginName)
  ) {
    return;
  }

  warnedPluginLoadFailures.add(pluginName);
  Reflect.apply(console.warn, console, [
    `GSAPReactMarquee: optional GSAP ${pluginName} plugin failed to load; that interactive feature was not initialized.`,
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
  const [pluginStatuses, setPluginStatuses] = useState<MarqueePluginStatuses>({
    draggable: "idle",
    observer: "idle",
  });
  const pluginStatusesRef = useRef(pluginStatuses);

  useEffect(() => {
    let isMounted = true;

    const publishPluginStatus = (
      pluginName: MarqueePluginName,
      status: PluginStatus
    ) => {
      if (!isMounted) return;
      const nextStatuses = {
        ...pluginStatusesRef.current,
        [pluginName]: status,
      };
      pluginStatusesRef.current = nextStatuses;
      setPluginStatuses(nextStatuses);
    };

    const resetInactivePlugin = (pluginName: MarqueePluginName) => {
      const status = pluginStatusesRef.current[pluginName];
      if (status === "loading" || status === "failed") {
        publishPluginStatus(pluginName, "idle");
      }
    };

    if (scrollFollow && !pluginsRef.current.observer) {
      publishPluginStatus("observer", "loading");
      void loadObserverPlugin()
        .then((Observer) => {
          if (!isMounted) return;
          registerObserverPlugin(Observer);
          pluginsRef.current.observer = Observer;
          publishPluginStatus("observer", "ready");
        })
        .catch(() => {
          if (!isMounted) return;
          publishPluginStatus("observer", "failed");
          warnPluginLoadFailure("observer");
        });
    } else if (!scrollFollow) {
      resetInactivePlugin("observer");
    }

    if (draggable && !pluginsRef.current.draggable) {
      publishPluginStatus("draggable", "loading");
      void loadDraggablePlugins()
        .then((plugins) => {
          if (!isMounted) return;
          registerDraggablePlugins(plugins);
          pluginsRef.current.draggable = plugins;
          publishPluginStatus("draggable", "ready");
        })
        .catch(() => {
          if (!isMounted) return;
          publishPluginStatus("draggable", "failed");
          warnPluginLoadFailure("draggable");
        });
    } else if (!draggable) {
      resetInactivePlugin("draggable");
    }

    return () => {
      isMounted = false;
    };
  }, [draggable, scrollFollow]);

  const pluginsReady =
    (!draggable ||
      pluginsRef.current.draggable !== null ||
      pluginStatuses.draggable === "failed") &&
    (!scrollFollow ||
      pluginsRef.current.observer !== null ||
      pluginStatuses.observer === "failed");

  return { pluginStatuses, pluginsReady, pluginsRef };
};
