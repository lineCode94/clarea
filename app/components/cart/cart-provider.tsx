"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "../../types/catalog";
export type CartLine = { id: string; name: string; image: string; price: number; quantity: number };
const key = "clarea-cart-v1";
function parse(value: string | null): CartLine[] {
  try {
    const data = JSON.parse(value || "[]");
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data
      .filter(
        (i) =>
          i &&
          typeof i.id === "string" &&
          !seen.has(i.id) &&
          seen.add(i.id) &&
          typeof i.name === "string" &&
          typeof i.image === "string" &&
          i.image.startsWith("/") &&
          !i.image.startsWith("//") &&
          Number.isFinite(i.price) &&
          i.price >= 0 &&
          Number.isInteger(i.quantity) &&
          i.quantity > 0 &&
          i.quantity <= 20,
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}
type Cart = {
  items: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product) => void;
  quantity: (id: string, n: number) => void;
  clear: () => void;
  ready: boolean;
};
const Context = createContext<Cart | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]),
    [open, setOpen] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setItems(parse(localStorage.getItem(key)));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch {}
  }, [items, ready]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key) setItems(parse(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const add = (p: Product) => {
    if (!ready || !p.available || p.public_price == null) return;
    setItems((old) =>
      old.some((i) => i.id === p.id)
        ? old.map((i) => (i.id === p.id ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i))
        : old.length < 50
          ? [
              ...old,
              { id: p.id, name: p.name, image: p.images[0], price: p.public_price!, quantity: 1 },
            ]
          : old,
    );
    setOpen(true);
  };
  return (
    <Context.Provider
      value={{
        items,
        open,
        setOpen,
        ready,
        add,
        quantity: (id, n) =>
          setItems((old) =>
            n < 1
              ? old.filter((i) => i.id !== id)
              : old.map((i) => (i.id === id ? { ...i, quantity: Math.min(20, n) } : i)),
          ),
        clear: () => setItems([]),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCart() {
  const cart = useContext(Context);
  if (!cart) throw new Error("Cart provider missing");
  return cart;
}
