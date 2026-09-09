"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TbSearch } from "react-icons/tb";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";
import type { Product } from "../../types/catalog";
import type { CatalogFilters } from "../../hooks/use-catalog-filters";
import CatalogToolbar from "./catalog-toolbar";
import ProductCard from "./product-card";
export default function ProductCatalog({
  lang,
  filters,
  onSelect,
}: {
  lang: Language;
  filters: CatalogFilters;
  onSelect: (product: Product) => void;
}) {
  const t = text[lang];
  const reduced = useReducedMotion();
  const { filtered, reset } = filters;
  return (
    <section id="collection" className="page-width pb-16">
      <CatalogToolbar lang={lang} filters={filters} />
      <p className="mb-4 text-xs text-muted" aria-live="polite">
        {lang === "ar" ? `عدد المنتجات: ${filtered.length}` : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
      </p>
      <motion.div
        layout
        className="grid grid-cols-1 gap-x-6 gap-y-9 min-[480px]:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((product, i) => (
            <motion.article
              layout
              key={product.id}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.16) }}
              className="product-card group min-w-0"
            >
              <ProductCard product={product} lang={lang} onSelect={onSelect} priority={i < 3} />
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {!filtered.length && (
        <div className="py-20 text-center">
          <TbSearch size={30} className="mx-auto mb-4 text-muted" />
          <p>{t.empty}</p>
          <button onClick={reset} className="rounded-lg bg-brand px-5 py-3 text-white">
            {t.reset}
          </button>
        </div>
      )}
      <p className="mt-7 mb-0 text-sm text-muted">{t.note}</p>
    </section>
  );
}

