"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Replaces motion/react's useReducedMotion. Every animation on the site is now
 * CSS, so this hook was the only reason the library was still installed — and
 * it isn't worth the bundle on a landing page.
 *
 * The media query is an external store, so it's read through
 * useSyncExternalStore rather than mirrored into state inside an effect.
 */
function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** No media queries on the server — assume motion is allowed, then correct on hydration. */
function getServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
