import "server-only";
import { supplierReport } from "./supplier-report";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin, sameOrigin, limitedJson, AdminError } from "./admin-auth";
import { readCatalog, saveCatalog, ConflictError } from "./catalog-store";
import { failure } from "./admin-response";
import {
  stockInput,
  pricingInput,
  saleInput,
  stockState,
  figures,
  round,
  dayInCairo,
  totals,
  byProduct,
} from "./inventory-schema";
const json = (v: unknown) =>
  NextResponse.json(v, { headers: { "Cache-Control": "private, no-store" } });
type Catalog = Awaited<ReturnType<typeof readCatalog>>;
export function inventoryRows(c: Catalog) {
  return c.products.map((p) => {
    const entry = c.inventory[p.id];
    const stock = entry?.stock,
      pricing = entry?.pricing;
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      published: p.published,
      image: p.images[0],
      stock: stock?.quantity ?? null,
      min_alert: stock?.min_stock_alert ?? null,
      status: stock?.status || (p.available ? "available" : "out_of_stock"),
      stock_initialized: !!stock,
      pricing_initialized: !!pricing,
      low_stock: !!stock && stock.quantity < stock.min_stock_alert,
      last_updated: entry?.updated_at || null,
      ...(pricing ? { ...pricing, ...figures(pricing) } : {}),
    };
  });
}
export async function inventoryGet() {
  try {
    await requireAdmin();
    const c = await readCatalog();
    return json({
      products: inventoryRows(c),
      version: c.version,
      sales: c.sales.slice(-200).reverse(),
      priceHistory: c.priceHistory.slice(-200).reverse(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function updateInventory(request: Request, id: string, kind: "stock" | "pricing") {
  try {
    sameOrigin(request);
    await requireAdmin();
    const body = z
      .object({ version: z.string().max(200).optional() })
      .passthrough()
      .parse(await limitedJson(request));
    const { version, ...values } = body;
    const c = await readCatalog();
    if (version && version !== c.version)
      throw new ConflictError("البيانات اتعدلت. حدّث القائمة قبل الحفظ.");
    if (!c.products.some((p) => p.id === id)) throw new AdminError("المنتج غير موجود", 404);
    const now = new Date().toISOString();
    const old = c.inventory[id] || { created_at: now, updated_at: now };
    if (kind === "stock") {
      const input = stockInput.parse(values);
      if (input.status === "coming_soon" && input.quantity > 0)
        throw new AdminError("قريباً يتطلب كمية صفر");
      c.inventory[id] = { ...old, stock: stockState(input, now), updated_at: now };
    } else {
      const pricing = pricingInput.parse(values);
      if (JSON.stringify(old.pricing) !== JSON.stringify(pricing))
        c.priceHistory.push({
          product_id: id,
          old_pricing: old.pricing || null,
          new_pricing: pricing,
          changed_by: "owner",
          changed_at: now,
        });
      c.inventory[id] = { ...old, pricing, updated_at: now };
    }
    const saved = await saveCatalog(c.products, c.version, c);
    return json({
      success: true,
      version: saved.version,
      product: inventoryRows(saved).find((p) => p.id === id),
      priceHistory: saved.priceHistory.slice(-200).reverse(),
      ...(kind === "pricing" ? { ...figures(c.inventory[id].pricing!), price_updated: true } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function recordSale(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const input = saleInput.parse(await limitedJson(request));
    const c = await readCatalog();
    if (c.orders.some((o) => o.reference === input.order_reference))
      throw new AdminError("سجّل تسليم الطلب من صفحة الطلبات", 409);
    const previous = c.sales.find((s) => s.request_id === input.request_id);
    if (previous) {
      if (
        previous.product_id !== input.product_id ||
        previous.quantity_sold !== input.quantity_sold ||
        previous.order_reference !== input.order_reference
      )
        throw new AdminError("رقم العملية مستخدم لبيانات مختلفة", 409);
      return json({ success: true, duplicate: true, sale: previous });
    }
    if (
      c.sales.some(
        (s) => s.order_reference === input.order_reference && s.product_id === input.product_id,
      )
    )
      throw new AdminError("تم تسجيل هذا المنتج لنفس الطلب بالفعل", 409);
    const product = c.products.find((p) => p.id === input.product_id);
    if (!product) throw new AdminError("المنتج غير موجود", 404);
    const entry = c.inventory[product.id];
    if (!entry?.stock || !entry.pricing) throw new AdminError("أدخل المخزون والأسعار أولاً");
    if (entry.stock.status !== "available" || entry.stock.quantity < input.quantity_sold)
      throw new AdminError("المخزون غير كافٍ", 409);
    const now = new Date().toISOString(),
      f = figures(entry.pricing),
      revenue = round(input.quantity_sold * f.effective_price),
      cost = round(input.quantity_sold * entry.pricing.cost_price);
    const sale = {
      ...input,
      id: randomUUID(),
      name: product.name,
      category: product.category,
      selling_price: f.effective_price,
      cost_price: entry.pricing.cost_price,
      discount: entry.pricing.discount,
      revenue,
      cost,
      profit: round(revenue - cost),
      date: now,
      changed_by: "owner",
    };
    c.sales.push(sale);
    entry.stock = stockState(
      {
        quantity: entry.stock.quantity - input.quantity_sold,
        min_stock_alert: entry.stock.min_stock_alert,
      },
      now,
    );
    entry.updated_at = now;
    // One conditional private-Blob write commits quantity, price snapshot and sale together.
    const saved = await saveCatalog(c.products, c.version, c);
    return json({
      success: true,
      sale,
      version: saved.version,
      stock_remaining: entry.stock.quantity,
      profit_from_sale: sale.profit,
      revenue: sale.revenue,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function report(request: Request, kind: string) {
  try {
    await requireAdmin();
    const c = await readCatalog(),
      q = new URL(request.url).searchParams,
      today = dayInCairo(new Date().toISOString());
    if (kind === "supplier") return json(supplierReport(c.sales, q));
    const category = z
      .enum(["all", "skin", "hair", "supplements", "oral", "drinks"])
      .parse(q.get("category") || "all");
    const month = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .parse(q.get("month") || today.slice(0, 7));
    const date = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v,
        "تاريخ غير صحيح",
      )
      .parse(q.get("date") || today);
    const rows = inventoryRows(c).filter((p) => category === "all" || p.category === category);
    if (kind === "low-stock")
      return json(
        rows
          .filter((p) => p.low_stock)
          .map((p) => ({
            product_id: p.id,
            product: p.name,
            current_stock: p.stock,
            min_alert: p.min_alert,
            action: "أعد الطلب قريباً",
          })),
      );
    if (kind === "profit-margins") {
      const margins = rows
        .filter((p) => p.pricing_initialized)
        .map((p) => ({
          id: p.id,
          product: p.name,
          margin: p.sales_margin,
          markup: p.profit_margin,
        }))
        .filter((p) => p.margin !== null && p.margin !== undefined)
        .sort((a, b) => b.margin! - a.margin!);
      return json({
        highest_margin: margins[0] || null,
        lowest_margin: margins.at(-1) || null,
        average_margin: margins.length
          ? round(margins.reduce((s, p) => s + p.margin!, 0) / margins.length)
          : null,
        products: margins,
      });
    }
    let sales = c.sales.filter((s) => category === "all" || s.category === category);
    if (kind === "daily-summary") {
      sales = sales.filter((s) => dayInCairo(s.date) === date);
      return json({
        date,
        ...totals(sales),
        total_sales: totals(sales).total_revenue,
        top_product: byProduct(sales)[0]?.name || null,
      });
    }
    if (kind === "best-sellers") {
      const period = z.enum(["monthly", "all"]).parse(q.get("period") || "monthly");
      if (period === "monthly") sales = sales.filter((s) => dayInCairo(s.date).startsWith(month));
      return json(byProduct(sales).map((p, i) => ({ ...p, rank: i + 1 })));
    }
    sales = sales.filter((s) => dayInCairo(s.date).startsWith(month));
    return json({
      period: month,
      timezone: "Africa/Cairo",
      ...totals(sales),
      products: byProduct(sales),
    });
  } catch (e) {
    return failure(e);
  }
}
