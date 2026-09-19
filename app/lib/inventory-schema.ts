import { z } from "zod";
import { orderSchema } from "./order-schema";
const money = z
  .number()
  .finite()
  .min(0)
  .max(10000000)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001,
    "استخدم منزلتين عشريتين كحد أقصى",
  );
export const stockInput = z
  .object({
    quantity: z.number().int().min(0).max(1000000),
    min_stock_alert: z.number().int().min(0).max(1000000),
    status: z.enum(["available", "coming_soon", "out_of_stock"]).optional(),
  })
  .strict();
export const pricingInput = z
  .object({
    cost_price: money,
    selling_price: money,
    discount: z.number().finite().min(0).max(100).default(0),
  })
  .strict();
export const inventoryEntry = z.object({
  stock: z
    .object({
      quantity: z.number().int().nonnegative(),
      min_stock_alert: z.number().int().nonnegative(),
      status: z.enum(["available", "coming_soon", "out_of_stock"]),
      last_updated: z.string(),
    })
    .optional(),
  pricing: pricingInput.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const saleInput = z
  .object({
    product_id: z.string().min(1).max(100),
    quantity_sold: z.number().int().min(1).max(1000000),
    request_id: z.string().uuid(),
    order_reference: z.string().trim().min(1).max(100),
  })
  .strict();
export const saleSchema = z.object({
  order_id: z.string().optional(),
  id: z.string(),
  request_id: z.string(),
  order_reference: z.string(),
  product_id: z.string(),
  name: z.string(),
  category: z.string(),
  quantity_sold: z.number().int().positive(),
  selling_price: money,
  cost_price: money,
  discount: z.number(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
  date: z.string(),
  changed_by: z.string(),
});
export const historySchema = z.object({
  product_id: z.string(),
  old_pricing: pricingInput.nullable(),
  new_pricing: pricingInput,
  changed_by: z.string(),
  changed_at: z.string(),
});
export const ledgerSchema = z.object({
  orders: z.array(orderSchema).default([]),
  orderSequence: z.number().int().nonnegative().default(0),
  inventory: z.record(z.string(), inventoryEntry).default({}),
  priceHistory: z.array(historySchema).default([]),
  sales: z.array(saleSchema).default([]),
});
export type Ledger = z.infer<typeof ledgerSchema>;
export type Sale = z.infer<typeof saleSchema>;
export const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export function figures(p: z.infer<typeof pricingInput>) {
  const effective_price = round(p.selling_price * (1 - p.discount / 100));
  const profit_per_unit = round(effective_price - p.cost_price);
  return {
    effective_price,
    profit_per_unit,
    profit_margin: p.cost_price > 0 ? round((profit_per_unit / p.cost_price) * 100) : null,
    sales_margin: effective_price > 0 ? round((profit_per_unit / effective_price) * 100) : null,
  };
}
export function stockState(input: z.infer<typeof stockInput>, now: string) {
  if (input.status === "coming_soon" && input.quantity > 0)
    throw new Error("قريباً يتطلب كمية صفر؛ استخدم متوفر للكمية الموجبة");
  return {
    ...input,
    status: (input.quantity > 0
      ? "available"
      : input.status === "coming_soon"
        ? "coming_soon"
        : "out_of_stock") as "available" | "coming_soon" | "out_of_stock",
    last_updated: now,
  };
}
export function dayInCairo(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function totals(sales: Sale[]) {
  const total_revenue = round(sales.reduce((s, x) => s + x.revenue, 0)),
    total_cost = round(sales.reduce((s, x) => s + x.cost, 0));
  return {
    total_revenue,
    orders_count: new Set(sales.map((s) => s.order_reference)).size,
    total_cost,
    total_profit: round(total_revenue - total_cost),
    units_sold: sales.reduce((s, x) => s + x.quantity_sold, 0),
    profit_margin:
      total_revenue > 0 ? round(((total_revenue - total_cost) / total_revenue) * 100) : null,
  };
}
export function byProduct(sales: Sale[]) {
  const groups = new Map<string, Sale[]>();
  for (const sale of sales)
    groups.set(sale.product_id, [...(groups.get(sale.product_id) || []), sale]);
  return [...groups.entries()]
    .map(([id, items]) => {
      const t = totals(items);
      return {
        id,
        name: items.at(-1)!.name,
        product: items.at(-1)!.name,
        units_sold: t.units_sold,
        revenue: t.total_revenue,
        cost: t.total_cost,
        profit: t.total_profit,
        profit_margin: t.profit_margin,
      };
    })
    .sort((a, b) => b.units_sold - a.units_sold);
}
