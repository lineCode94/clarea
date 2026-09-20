"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { GiLipstick } from "react-icons/gi";

// Only the decorative trail lags; the native cursor keeps an exact click target.
export default function BeautyCursor() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const softX = useSpring(x, { stiffness: 180, damping: 24, mass: 0.7 });
  const softY = useSpring(y, { stiffness: 180, damping: 24, mass: 0.7 });

  useEffect(() => {
    if (reduced) return;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const hide = () => setVisible(false);
    const move = (event: PointerEvent) => {
      const target = event.target;
      const editing =
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable], dialog");
      if (!finePointer.matches || event.pointerType !== "mouse" || editing) {
        hide();
        return;
      }
      x.set(event.clientX + 12);
      y.set(event.clientY + 18);
      setVisible(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("pointerleave", hide);
    finePointer.addEventListener("change", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
      finePointer.removeEventListener("change", hide);
    };
  }, [reduced, x, y]);

  // Keep the initial DOM consistent; CSS hides the trail for reduced motion.
  return (
    <motion.div
      aria-hidden="true"
      data-testid="beauty-cursor-trail"
      style={{ x: softX, y: softY, opacity: !reduced && visible ? 0.22 : 0 }}
      className="pointer-events-none fixed left-0 top-0 z-[100] text-brand transition-opacity duration-150"
    >
      <GiLipstick size={24} />
    </motion.div>
  );
}
