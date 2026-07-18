import { useEffect, useLayoutEffect } from "react";

/** Layout effect in browsers, passive effect during server rendering. */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
