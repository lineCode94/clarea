export type RecentOrder = { reference: string; tracking_path: string };
const key = "clarea-recent-orders-v1";
export function recentOrders(): RecentOrder[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (o) =>
              typeof o?.reference === "string" &&
              /^\/track#[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(o.tracking_path),
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function rememberOrder(order: { reference: string; tracking_path?: string }) {
  if (!order.tracking_path) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          { reference: order.reference, tracking_path: order.tracking_path },
          ...recentOrders().filter((o) => o.reference !== order.reference),
        ].slice(0, 20),
      ),
    );
  } catch {}
  /* Notify same-tab listeners (storage event only fires cross-tab) */
  window.dispatchEvent(new CustomEvent("clarea-order-saved"));
}
