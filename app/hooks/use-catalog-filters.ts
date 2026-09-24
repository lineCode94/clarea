"use client";

import { matchesAdminProduct } from "../lib/admin-search";
import { popularProductIds } from "../config/home-collections";
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
    const matching = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesStock = !onlyAvailable || product.available;
      return matchesCategory && matchesStock && matchesAdminProduct(product, query);
    });

    return matching.sort((a, b) => {
      if (sort === "best-selling") {
        const rank = (p: typeof a) => {
          const sold = p.best_seller_rank;
          const popular = popularProductIds.indexOf(p.id);
          return sold !== undefined ? sold : popular >= 0 ? 10000 + popular : Infinity;
        };
        return rank(a) - rank(b) || Number(b.available) - Number(a.available);
      }
      if (sort === "price-low-high") {
        const priceA = a.public_price ?? Infinity;
        const priceB = b.public_price ?? Infinity;
        return priceA - priceB;
      }
      if (sort === "price-high-low") {
        const priceA = a.public_price ?? Infinity;
        const priceB = b.public_price ?? Infinity;
        if (!Number.isFinite(priceA)) return Number.isFinite(priceB) ? 1 : 0;
        if (!Number.isFinite(priceB)) return -1;
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
    setSort("featured");
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
