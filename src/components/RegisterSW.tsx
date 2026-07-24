"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so Baseline is installable and works offline.
 * Production-only — a SW in `next dev` fights HMR and serves stale bundles.
 * Renders nothing.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
