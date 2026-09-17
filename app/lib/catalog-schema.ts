import { z } from "zod";

const localized = z.object({ ar: z.string().max(4000), en: z.string().max(4000) });
const imagePath = z
  .string()
  .max(300)
  .regex(/^\/[a-zA-Z0-9/_\-.]+$/)
  .refine((s) => !s.includes("..") && !s.startsWith("//"));
export const managedProductSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1, "اسم المنتج مطلوب").max(180),
  brand: z.string().trim().max(100),
  category: z.enum(["skin", "hair", "supplements"]),
  available: z.boolean(),
  published: z.boolean(),
  newArrival: z.boolean(),
  images: z.array(imagePath).min(1, "أضف صورة واحدة على الأقل").max(6),
  tone: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  label: localized,
  description: localized.refine(
    (v) => v.ar.trim().length > 0 && v.en.trim().length > 0,
    "الوصف العربي والإنجليزي مطلوبان",
  ),
  source: z.string().url().max(1000).optional(),
  imageTransform: z.string().max(100).optional(),
  details: z
    .object({
      size: z.string().max(100),
      skinType: localized,
      ingredients: z.object({
        ar: z.array(z.string().max(1000)).max(50),
        en: z.array(z.string().max(1000)).max(50),
      }),
      usage: z.object({
        ar: z.array(z.string().max(1000)).max(20),
        en: z.array(z.string().max(1000)).max(20),
      }),
      caution: localized,
      contents: z
        .object({
          ar: z.array(z.string().max(1000)).max(30),
          en: z.array(z.string().max(1000)).max(30),
        })
        .optional(),
    })
    .optional(),
});
export type ManagedProduct = z.infer<typeof managedProductSchema>;
import { ledgerSchema } from "./inventory-schema";
export const catalogSchema = ledgerSchema.extend({
  products: z.array(managedProductSchema).max(2000),
});
