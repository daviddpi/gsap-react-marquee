const CLONE_ATTRIBUTE = "data-gsap-react-marquee-clone";

export const MARQUEE_CLONE_SELECTOR = `[${CLONE_ATTRIBUTE}]`;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "audio[controls]",
  "button",
  "embed",
  "iframe",
  "input:not([type='hidden'])",
  "object",
  "select",
  "summary",
  "textarea",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

const UNSUPPORTED_CONTENT_SELECTOR = [
  "[id]",
  "a[href]",
  "area[href]",
  "button",
  "embed",
  "iframe",
  "input",
  "object",
  "select",
  "textarea",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

const ID_REFERENCE_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
  "for",
  "form",
  "headers",
  "itemref",
  "list",
] as const;

const LOCAL_URL_REFERENCE_ATTRIBUTES = [
  "clip-path",
  "fill",
  "filter",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "stroke",
] as const;

const LOCAL_FRAGMENT_PATTERN = /^\s*#/;
const LOCAL_URL_PATTERN = /url\(\s*["']?#/i;

export const supportsNativeInert = (): boolean =>
  typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;

export const hasUnsupportedMarqueeContent = (
  original: HTMLElement
): boolean => {
  if (original.querySelector(UNSUPPORTED_CONTENT_SELECTOR)) return true;

  return Array.from(original.querySelectorAll<HTMLElement>("[tabindex]")).some(
    (element) => element.tabIndex >= 0
  );
};

const sanitizeCloneElement = (element: Element) => {
  const wasFocusable = element.matches(FOCUSABLE_SELECTOR);

  element.removeAttribute("id");
  element.removeAttribute("name");

  ID_REFERENCE_ATTRIBUTES.forEach((attribute) => {
    element.removeAttribute(attribute);
  });

  const href = element.getAttribute("href");
  if (href && LOCAL_FRAGMENT_PATTERN.test(href)) {
    element.removeAttribute("href");
  }

  const xlinkHref = element.getAttribute("xlink:href");
  if (xlinkHref && LOCAL_FRAGMENT_PATTERN.test(xlinkHref)) {
    element.removeAttribute("xlink:href");
  }

  LOCAL_URL_REFERENCE_ATTRIBUTES.forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (value && LOCAL_URL_PATTERN.test(value)) {
      element.removeAttribute(attribute);
    }
  });

  if (element instanceof HTMLElement) {
    Array.from(element.style).forEach((property) => {
      if (LOCAL_URL_PATTERN.test(element.style.getPropertyValue(property))) {
        element.style.removeProperty(property);
      }
    });
  }

  if (wasFocusable) {
    element.setAttribute("tabindex", "-1");
  }
};

export const sanitizeMarqueeClones = (
  container: HTMLElement,
  nativeInert = supportsNativeInert()
) => {
  const clones = Array.from(
    container.querySelectorAll<HTMLElement>(MARQUEE_CLONE_SELECTOR)
  );

  clones.forEach((clone) => {
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");

    if (nativeInert) {
      clone.inert = true;
      clone.removeAttribute("data-gsap-react-marquee-inert-fallback");
    } else {
      clone.setAttribute("data-gsap-react-marquee-inert-fallback", "");
    }

    sanitizeCloneElement(clone);
    clone.querySelectorAll("*").forEach(sanitizeCloneElement);
  });
};

export const installMarqueeCloneFocusGuard = (
  container: HTMLElement,
  nativeInert = supportsNativeInert()
): (() => void) => {
  if (nativeInert) return () => undefined;

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const clone = target.closest(MARQUEE_CLONE_SELECTOR);
    if (!clone || !container.contains(clone)) return;

    const focusTarget = target as Element & { blur?: () => void };
    focusTarget.blur?.();

    if (document.activeElement === target) {
      const activeElement = document.activeElement as Element & {
        blur?: () => void;
      };
      activeElement.blur?.();
    }
  };

  container.addEventListener("focusin", handleFocusIn);
  return () => container.removeEventListener("focusin", handleFocusIn);
};
