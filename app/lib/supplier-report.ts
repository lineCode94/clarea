import { z } from "zod";
import { dayInCairo, type Sale } from "./inventory-schema";
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v,
    "تاريخ غير صحيح",
  );
export function supplierReport(sales: Sale[], query: URLSearchParams) {
  const period = z.enum(["weekly", "monthly"]).parse(query.get("period") || "monthly");
  const anchor = dateSchema.parse(query.get("date") || dayInCairo(new Date().toISOString()));
  const start = new Date(anchor + "T12:00:00Z");
  if (period === "weekly")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 1) % 7)); // Saturday–Friday, Cairo calendar dates.
  else start.setUTCDate(1);
  const end = new Date(start);
  if (period === "weekly") end.setUTCDate(end.getUTCDate() + 6);
  else {
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
  }
  const from = start.toISOString().slice(0, 10),
    to = end.toISOString().slice(0, 10);
  const selected = sales.filter((s) => {
    const d = dayInCairo(s.date);
    return d >= from && d <= to;
  });
  const grouped = new Map<
    string,
    {
      product_id: string;
      name: string;
      quantity: number;
      unit_cost: number;
      total: number;
      references: string[];
    }
  >();
  for (const s of selected) {
    // Keep separate rows when the same product was sold at different supplier costs.
    const key = s.product_id + ":" + Math.round(s.cost_price * 100);
    const row = grouped.get(key) || {
      product_id: s.product_id,
      name: s.name,
      quantity: 0,
      unit_cost: s.cost_price,
      total: 0,
      references: [],
    };
    row.quantity += s.quantity_sold;
    row.total += Math.round(s.cost_price * 100) * s.quantity_sold;
    if (!row.references.includes(s.order_reference)) row.references.push(s.order_reference);
    grouped.set(key, row);
  }
  const rows = [...grouped.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => ({ ...r, total: r.total / 100 }));
  return {
    period,
    from,
    to,
    timezone: "Africa/Cairo",
    rows,
    quantity: rows.reduce((n, r) => n + r.quantity, 0),
    orders: new Set(selected.map((s) => s.order_reference)).size,
    total: rows.reduce((n, r) => n + Math.round(r.total * 100), 0) / 100,
  };
}
export type SupplierReport = ReturnType<typeof supplierReport>;
