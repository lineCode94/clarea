"use client";
import { useState } from "react";
import styles from "./brand-strip.module.css";
export default function BrandStrip({
  brands,
  onExplore,
  ar,
}: {
  brands: string[];
  onExplore: (category: string, query?: string) => void;
  ar: boolean;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <>
      <div className={styles.viewport + (paused ? " " + styles.paused : "")}>
        <div className={styles.track}>
          {[false, true].map((copy) => (
            <div
              key={String(copy)}
              className={styles.group + (copy ? " " + styles.duplicate : "")}
              aria-hidden={copy || undefined}
            >
              {brands.map((brand, i) => (
                <button
                  key={brand}
                  tabIndex={copy ? -1 : 0}
                  onClick={() => onExplore("all", brand)}
                  style={{ animationDelay: Math.min(i * 45, 600) + "ms" }}
                  className={
                    styles.brand +
                    " py-3 font-serif text-3xl text-[#334d47] hover:text-brand md:text-4xl"
                  }
                >
                  {brand}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((v) => !v)}
        className="mt-3 rounded-full border border-line px-4 py-2 text-xs text-muted md:hidden motion-reduce:hidden"
      >
        {paused
          ? ar
            ? "تشغيل الحركة"
            : "Resume movement"
          : ar
            ? "إيقاف الحركة"
            : "Pause movement"}
      </button>
    </>
  );
}
