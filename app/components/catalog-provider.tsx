"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ManagedProduct } from "../lib/catalog-schema";
type StoreProduct = ManagedProduct & { best_seller_rank?: number };
const CatalogContext = createContext<StoreProduct[]>([]);
export function CatalogProvider({
  products,
  children,
}: {
  products: StoreProduct[];
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}
export const useProducts = () => useContext(CatalogContext);
