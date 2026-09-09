"use client";

import { useRef } from "react";
import { TbArrowLeft, TbArrowRight } from "react-icons/tb";
import type { Language, Product } from "../../types/catalog";
import ProductCard from "../catalog/product-card";

type Props = {
  lang: Language;
  title: string;
  subtitle?: string;
  products: Product[];
  onSelect: (product: Product) => void;
  onViewAll: () => void;
};

export default function ProductShelf({
  lang,
  title,
  subtitle,
  products,
  onSelect,
  onViewAll,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  function scroll(forward: boolean) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: el.clientWidth * (forward ? 1 : -1) * (lang === "ar" ? -1 : 1),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  return (
    <section className="page-width py-12 md:py-16" aria-label={title}>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h2 className="mb-2 text-2xl text-brand md:text-3xl">{title}</h2>
          {subtitle && <p className="mb-0 text-sm text-muted">{subtitle}</p>}
        </div>
        <button
          onClick={onViewAll}
          className="shrink-0 border-b border-brand pb-1 text-sm text-brand"
        >
          {lang === "ar" ? "عرض الكل" : "View all"}
        </button>
      </div>
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {products.map((product) => (
          <article
            key={product.id}
            className="group min-w-0 w-[78%] shrink-0 snap-start sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-60px)/4)]"
          >
            <ProductCard product={product} lang={lang} onSelect={onSelect} />
          </article>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => scroll(false)}
          title={lang === "ar" ? "السابق" : "Previous"}
          aria-label={lang === "ar" ? "السابق" : "Previous"}
          className="grid size-10 place-items-center rounded-full border border-line text-brand hover:bg-brand/5"
        >
          <TbArrowLeft size={20} className="rtl:rotate-180" />
        </button>
        <button
          onClick={() => scroll(true)}
          title={lang === "ar" ? "التالي" : "Next"}
          aria-label={lang === "ar" ? "التالي" : "Next"}
          className="grid size-10 place-items-center rounded-full border border-line text-brand hover:bg-brand/5"
        >
          <TbArrowRight size={20} className="rtl:rotate-180" />
        </button>
      </div>
    </section>
  );
}
