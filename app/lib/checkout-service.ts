import "server-only";
import { customerEmail } from "./customer-auth";
import { trackingPath } from "./order-tracking";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, limitedJson, limitLogin, AdminError } from "./admin-auth";
import { readCatalog, saveCatalog, ConflictError } from "./catalog-store";
import { failure } from "./admin-response";
import { figures, round, dayInCairo } from "./inventory-schema";
import type { Order } from "./order-schema";

const inputSchema = z
  .object({
    request_id: z.string().uuid(),
    customer: z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z
          .string()
          .trim()
          .transform((s) => s.replace(/[\s()-]/g, ""))
          .pipe(
            z
              .string()
              .regex(
                /^(?:\+?20|0)1[0125]\d{8}$/,
                "أدخل رقم موبايل مصري صحيح / Enter a valid Egyptian mobile number",
              ),
          ),
        email: z.string().trim().email().max(254).optional(),
        address: z.string().trim().min(5).max(500),
      })
      .passthrough(),
    payment_method: z.literal("COD"),
    shipping_acknowledged: z.literal(true),
    items: z
      .array(
        z
          .object({
            product_id: z.string().min(1).max(100),
            quantity: z.number().int().min(1).max(20),
            expected_price: z.number().finite().nonnegative().max(10000000),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .refine((items) => new Set(items.map((i) => i.product_id)).size === items.length),
  })
  .strict();

// This projection is the only order information returned to an unauthenticated client.
function receipt(order: Order) {
  return NextResponse.json(
    {
      order: {
        reference: order.reference,
        tracking_path: trackingPath(order),
        status: order.status,
        payment_method: "COD",
        subtotal: order.revenue,
        shipping_fee: order.shipping_fee ?? null,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.selling_price,
          subtotal: i.revenue,
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function checkout(request: Request) {
  try {
    sameOrigin(request);
    const input = inputSchema.parse(await limitedJson(request, 20000));
    await limitLogin(request, "checkout");
    const verifiedEmail = await customerEmail();
    if (verifiedEmail) input.customer.email = verifiedEmail;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          ...input,
          items: [...input.items].sort((a, b) => a.product_id.localeCompare(b.product_id)),
        }),
      )
      .digest("hex");
    // Conditional writes plus a stable request ID make retries safe after a lost response.
    for (let attempt = 0; attempt < 3; attempt++) {
      const c = await readCatalog();
      const previous = c.orders.find((o) => o.request_id === input.request_id);
      if (previous) {
        if (previous.source !== "storefront" || previous.request_fingerprint !== fingerprint)
          throw new AdminError("راجع بيانات الطلب وأعد المحاولة / Request conflict", 409);
        return receipt(previous);
      }
      const items = input.items.map((line) => {
        const product = c.products.find((p) => p.id === line.product_id && p.published);
        const entry = c.inventory[line.product_id];
        if (
          !product ||
          !product.available ||
          (entry?.stock &&
            (entry.stock.status !== "available" || entry.stock.quantity < line.quantity))
        )
          throw new AdminError(
            "منتج غير متاح أو الكمية غير كافية. راجع السلة / Product or quantity unavailable",
            409,
          );
        if (!entry?.pricing)
          throw new AdminError("سعر منتج غير متاح / Product price unavailable", 409);
        const price = figures(entry.pricing).effective_price;
        if (price !== line.expected_price)
          throw new AdminError(
            "الأسعار اتغيرت. حدّث السلة وراجع الإجمالي / Prices changed. Refresh your cart",
            409,
          );
        const revenue = round(price * line.quantity);
        const costPending = entry.pricing.cost_price == null;
        const costPrice = entry.pricing.cost_price ?? 0;
        const cost = round(costPrice * line.quantity);
        return {
          product_id: product.id,
          name: product.name,
          category: product.category,
          quantity: line.quantity,
          selling_price: price,
          discount: entry.pricing.discount,
          cost_price: costPrice,
          cost_pending: costPending,
          revenue,
          cost,
          profit: costPending ? 0 : round(revenue - cost),
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
      const revenue = round(items.reduce((sum, i) => sum + i.revenue, 0));
      const cost = round(items.reduce((sum, i) => sum + i.cost, 0));
      const order: Order = {
        id: randomUUID(),
        request_id: input.request_id,
        request_fingerprint: fingerprint,
        reference,
        customer: input.customer,
        items,
        revenue,
        cost,
        profit: items.some((i) => i.cost_pending) ? 0 : round(revenue - cost),
        status: "pending",
        notes: "طلب من الموقع — يرجى تأكيد التوفر والشحن وموعد التوصيل مع العميل قبل التجهيز.",
        source: "storefront",
        payment_method: "COD",
        shipping_fee: revenue > 4000 ? 0 : null,
        created_at: now,
        updated_at: now,
        changed_by: "storefront",
      };
      c.orders.push(order);
      try {
        await saveCatalog(c.products, c.version, c);
        return receipt(order);
      } catch (e) {
        if (!(e instanceof ConflictError) || attempt === 2) throw e;
      }
    }
  } catch (e) {
    return failure(e);
  }
}
