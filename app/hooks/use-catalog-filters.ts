"use client";

import { useMemo, useState } from "react";
import { products } from "../data/products";
import type { Language } from "../types/catalog";

export function useCatalogFilters(lang: Language) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState("featured");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const matching = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesStock = !onlyAvailable || product.available;
      const searchableText = `${product.name} ${product.brand} ${product.label[lang]}`;
      return matchesCategory && matchesStock && searchableText.toLowerCase().includes(search);
    });

    return matching.sort((a, b) =>
      sort === "az" ? a.name.localeCompare(b.name) : Number(b.available) - Number(a.available),
    );
  }, [category, query, onlyAvailable, sort, lang]);

  function reset() {
    setQuery("");
    setCategory("all");
    setOnlyAvailable(false);
  }

  return {
    category,
    setCategory,
    query,
    setQuery,
    onlyAvailable,
    setOnlyAvailable,
    sort,
    setSort,
    filtered,
    reset,
  };
}

export type CatalogFilters = ReturnType<typeof useCatalogFilters>;
