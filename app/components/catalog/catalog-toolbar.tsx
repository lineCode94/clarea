"use client";
import { motion } from "framer-motion";
import { TbSearch } from "react-icons/tb";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";
import type { CatalogFilters } from "../../hooks/use-catalog-filters";
export default function CatalogToolbar({
  lang,
  filters,
}: {
  lang: Language;
  filters: CatalogFilters;
}) {
  const t = text[lang];
  const { category, setCategory, query, setQuery, onlyAvailable, setOnlyAvailable, sort, setSort } =
    filters;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <h2 className="mb-0 text-xl">{t.collection}</h2>
        <label className="flex min-h-11 w-full items-center gap-2 border-b border-brand/25 sm:w-[280px]">
          <TbSearch size={20} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex flex-wrap gap-1" role="group" aria-label={t.collection}>
          {[
            ["all", t.all],
            ["skin", t.skin],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              aria-pressed={category === id}
              className={`relative min-h-11 px-3 text-sm transition-colors sm:px-4 ${category === id ? "font-bold text-brand" : "text-muted hover:text-brand"}`}
            >
              {label}
              {category === id && (
                <motion.span
                  layoutId="category-line"
                  className="absolute inset-x-3 bottom-0 h-0.5 bg-brand"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <input
              className="size-4 accent-brand"
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            {t.stock}
          </label>
          <select
            aria-label={t.sort}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-11 max-w-full rounded border border-line bg-white px-2"
          >
            <option value="featured">{t.featured}</option>
            <option value="az">{t.az}</option>
          </select>
        </div>
      </div>
    </>
  );
}
