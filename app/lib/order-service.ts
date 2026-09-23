import "server-only";
import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin, sameOrigin, limitedJson, AdminError } from "./admin-auth";
import { readCatalog, saveCatalog, ConflictError } from "./catalog-store";
import { failure } from "./admin-response";
import { figures, round, dayInCairo, stockState } from "./inventory-schema";
import { orderInput, type Order } from "./order-schema";
const json = (value: unknown) =>
  NextResponse.json(value, {
    headers: { "Cache-Control": "private, no-store" },
  });
export async function listOrders(request: Request) {
  try {
    await requireAdmin();
    const c = await readCatalog();
    const q = new URL(request.url).searchParams;
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .parse(q.get("offset") || 0);
    const search = (q.get("q") || "").slice(0, 120).toLowerCase();
    const status = z
      .enum(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"])
      .parse(q.get("status") || "all");
    const all = c.orders.filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (!search ||
          o.reference.toLowerCase().includes(search) ||
          o.customer.name.toLowerCase().includes(search)),
    );
    return json({
      orders: all
        .slice()
        .reverse()
        .slice(offset, offset + 50),
      total: all.length,
      offset,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function createOrder(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const input = orderInput.parse(await limitedJson(request));
    const c = await readCatalog();
    const { version, request_id, ...content } = input;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          ...content,
          items: [...content.items].sort((a, b) => a.product_id.localeCompare(b.product_id)),
        }),
      )
      .digest("hex");
    const previous = c.orders.find((o) => o.request_id === request_id);
    if (previous) {
      if (previous.request_fingerprint !== fingerprint)
        throw new AdminError("معرف العملية مستخدم لطلب مختلف", 409);
      return json({ success: true, duplicate: true, order: previous });
    }
    if (version && version !== c.version)
      throw new ConflictError(
        "الأسعار أو المخزون اتعدلوا. حدّث بيانات المنتجات وراجع الإجمالي ثم أعد المحاولة.",
      );
    const items = input.items.map((line) => {
      const p = c.products.find((p) => p.id === line.product_id),
        entry = c.inventory[line.product_id];
      if (!p) throw new AdminError("منتج غير موجود", 404);
      if (!entry?.pricing || !entry.stock)
        throw new AdminError(`أدخل أسعار ومخزون ${p.name} أولاً`);
      if (entry.pricing.cost_price == null)
        throw new AdminError(`أدخل سعر شراء ${p.name} قبل تسجيل الطلب لحساب الربح بدقة`);
      if (entry.stock.status !== "available" || entry.stock.quantity < line.quantity)
        throw new AdminError(`المخزون غير كافٍ: ${p.name}`, 409);
      const appliedDiscount = input.discount_percent ?? entry.pricing.discount;
      const f = figures({ ...entry.pricing, discount: appliedDiscount }),
        revenue = round(f.effective_price * line.quantity),
        cost = round(entry.pricing.cost_price * line.quantity);
      return {
        ...line,
        name: p.name,
        category: p.category,
        selling_price: f.effective_price,
        cost_price: entry.pricing.cost_price,
        discount: appliedDiscount,
        revenue,
        cost,
        profit: round(revenue - cost),
      };
    });
    const now = new Date().toISOString();
    let reference: string;
    do {
      c.orderSequence++;
      reference = `CL-${dayInCairo(now).replaceAll("-", "")}-${String(c.orderSequence).padStart(6, "0")}`;
    } while (
      c.orders.some((o) => o.reference === reference) ||
      c.sales.some((s) => s.order_reference === reference)
    );
    const revenue = round(items.reduce((sum, i) => sum + i.revenue, 0)),
      cost = round(items.reduce((sum, i) => sum + i.cost, 0));
    const order: Order = {
      id: randomUUID(),
      reference,
      request_id,
      request_fingerprint: fingerprint,
      customer: input.customer,
      notes: input.notes,
      ...(input.discount_percent !== undefined ? { discount_percent: input.discount_percent } : {}),
      items,
      status: "pending",
      revenue,
      cost,
      profit: round(revenue - cost),
      created_at: now,
      updated_at: now,
      changed_by: "owner",
    };
    c.orders.push(order);
    await saveCatalog(c.products, c.version, c);
    return json({ success: true, order });
  } catch (e) {
    return failure(e);
  }
}
export async function changeOrder(request: Request, id: string) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const { status } = z
      .object({ status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]) })
      .strict()
      .parse(await limitedJson(request));
    const c = await readCatalog(),
      order = c.orders.find((o) => o.id === id);
    if (!order) throw new AdminError("الطلب غير موجود", 404);
    if (order.status === status) return json({ success: true, duplicate: true, order });
    if (order.status === "delivered" || order.status === "cancelled")
      throw new AdminError("الطلب منتهي ولا يمكن تغيير حالته مرة أخرى", 409);
    if (
      (status === "confirmed" && order.status !== "pending") ||
      (status === "shipped" && order.status !== "confirmed")
    )
      throw new AdminError("أكد الطلب أولاً واتبع ترتيب حالات الطلب", 409);
    const now = new Date().toISOString();
    if (status === "delivered") {
      // Validate every line before applying any changes; one CAS commits the whole order.
      for (const item of order.items) {
        const inventory = c.inventory[item.product_id];
        const stock = inventory?.stock;
        // Supplier costs can be unknown when a customer requests an order.
        // Resolve them before any stock/sales mutation; never book zero-cost profit.
        if (item.cost_pending) {
          const purchase = inventory?.pricing?.cost_price;
          if (purchase == null)
            throw new AdminError(`أدخل سعر شراء ${item.name} قبل تسجيل التسليم`, 409);
          item.cost_price = purchase;
          item.cost = round(purchase * item.quantity);
          item.profit = round(item.revenue - item.cost);
          item.cost_pending = false;
        }
        if (!stock || stock.status !== "available" || stock.quantity < item.quantity)
          throw new AdminError(`المخزون غير كافٍ: ${item.name}. لم يُخصم أي منتج.`, 409);
        if (
          c.sales.some(
            (s) => s.order_reference === order.reference && s.product_id === item.product_id,
          )
        )
          throw new AdminError("توجد مبيعات مسجلة لهذا الطلب؛ راجع السجل", 409);
      }
      for (const item of order.items) {
        const entry = c.inventory[item.product_id];
        entry.stock = stockState(
          {
            quantity: entry.stock!.quantity - item.quantity,
            min_stock_alert: entry.stock!.min_stock_alert,
          },
          now,
        );
        entry.updated_at = now;
        c.sales.push({
          id: randomUUID(),
          request_id: `${order.id}:${item.product_id}`,
          order_id: order.id,
          order_reference: order.reference,
          product_id: item.product_id,
          name: item.name,
          category: item.category,
          quantity_sold: item.quantity,
          selling_price: item.selling_price,
          cost_price: item.cost_price,
          discount: item.discount,
          revenue: item.revenue,
          cost: item.cost,
          profit: item.profit,
          date: now,
          changed_by: "owner",
        });
      }
      order.cost = round(order.items.reduce((sum, item) => sum + item.cost, 0));
      order.profit = round(order.revenue - order.cost);
      order.delivered_at = now;
    }
    order.status = status;
    order.updated_at = now;
    await saveCatalog(c.products, c.version, c);
    return json({ success: true, order });
  } catch (e) {
    return failure(e);
  }
}
