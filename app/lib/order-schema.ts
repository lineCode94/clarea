import { z } from "zod";
export const orderInput = z
  .object({
    request_id: z.string().uuid(),
    version: z.string().max(200).optional(),
    customer: z
      .object({
        name: z.string().trim().min(1, "اسم العميل مطلوب").max(120),
        phone: z.string().trim().max(40).default(""),
        email: z.string().email().max(254).optional(),
        address: z.string().trim().max(500).default(""),
      })
      .strict(),
    discount_percent: z.number().finite().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).default(""),
    items: z
      .array(
        z
          .object({
            product_id: z.string().min(1).max(100),
            quantity: z.number().int().min(1).max(1000000),
          })
          .strict(),
      )
      .min(1, "أضف منتجاً واحداً على الأقل")
      .max(50)
      .refine(
        (items) => new Set(items.map((i) => i.product_id)).size === items.length,
        "اجمع كمية المنتج في سطر واحد بدلاً من تكراره",
      ),
  })
  .strict();
export const orderLineSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  category: z.string(),
  quantity: z.number().int().positive(),
  selling_price: z.number().nonnegative(),
  cost_price: z.number().nonnegative(),
  cost_pending: z.boolean().optional(),
  discount: z.number(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
});
export const orderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  request_id: z.string(),
  request_fingerprint: z.string(),
  customer: orderInput.shape.customer,
  notes: z.string(),
  discount_percent: z.number().min(0).max(100).optional(),
  items: z.array(orderLineSchema),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  delivered_at: z.string().optional(),
  changed_by: z.string(),
  source: z.literal("storefront").optional(),
  payment_method: z.literal("COD").optional(),
  shipping_fee: z.number().nonnegative().nullable().optional(),
});
export type Order = z.infer<typeof orderSchema> & { tracking_path?: string };
export type OrderInput = z.infer<typeof orderInput>;
