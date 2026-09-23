"use client";

import { useMemo, useState } from "react";
import { useProducts } from "../components/catalog-provider";
import type { Language } from "../types/catalog";

export function useCatalogFilters(lang: Language) {
  const products = useProducts();
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

    return matching.sort((a, b) => {
      if (sort === "best-selling") {
        const salesA = (a as { sales_count?: number }).sales_count ?? 0;
        const salesB = (b as { sales_count?: number }).sales_count ?? 0;
        return Number(b.available) - Number(a.available) || salesB - salesA;
      }
      if (sort === "price-low-high") {
        const priceA = a.public_price ?? 0;
        const priceB = b.public_price ?? 0;
        return priceA - priceB;
      }
      if (sort === "price-high-low") {
        const priceA = a.public_price ?? 0;
        const priceB = b.public_price ?? 0;
        return priceB - priceA;
      }
      if (sort === "az") {
        return a.name.localeCompare(b.name);
      }
      return Number(b.available) - Number(a.available);
    });
  }, [category, query, onlyAvailable, sort, lang, products]);

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
