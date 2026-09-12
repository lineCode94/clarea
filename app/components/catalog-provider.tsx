"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ManagedProduct } from "../lib/catalog-schema";
const CatalogContext = createContext<ManagedProduct[]>([]);
export function CatalogProvider({
  products,
  children,
}: {
  products: ManagedProduct[];
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}
export const useProducts = () => useContext(CatalogContext);
