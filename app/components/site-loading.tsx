"use client";

import { useEffect, useState, type ReactNode } from "react";
import ClareaLoadingScreen from "./clarea-loading-screen";

/** Initial page readiness, not a simulated download percentage. */
export default function SiteLoading({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    const finish = () => {
      if (!disposed) setLoading(false);
    };
    const ready = () => {
      // Wait for fonts and give the hydrated page a frame to paint underneath.
      void document.fonts.ready.then(() => {
        if (!disposed) frame = requestAnimationFrame(finish);
      });
    };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    // A stalled asset must never trap visitors behind the loading overlay.
    const fallback = window.setTimeout(finish, 8000);
    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      cancelAnimationFrame(frame);
      window.removeEventListener("load", ready);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [loading]);

  return (
    <>
      <div inert={loading} aria-busy={loading}>
        {children}
      </div>
      <ClareaLoadingScreen isLoading={loading} />
    </>
  );
}
