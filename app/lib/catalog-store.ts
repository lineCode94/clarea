import "server-only";
import { ledgerSchema, type Ledger } from "./inventory-schema";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { unstable_cache, revalidateTag } from "next/cache";
import { products as seed } from "../data/products";
import { homeCollections } from "../config/home-collections";
import { catalogSchema, type ManagedProduct } from "./catalog-schema";

export const namespace = process.env.CATALOG_NAMESPACE || "clarea";
const key = `${namespace}/catalog.json`;
export class ConflictError extends Error {}

// Compressed JSON reads may carry a weak HTTP ETag. Blob writes compare the
// underlying storage ETag, which has the same value without the W/ prefix.
export const storageETag = (etag: string) => etag.replace(/^W\//, "");

export async function readCatalog(): Promise<
  Ledger & { products: ManagedProduct[]; version: string }
> {
  const result = await get(key, { access: "private", useCache: false });
  if (!result)
    return {
      products: seed.map((p) => ({
        ...p,
        published: true,
        newArrival: homeCollections.newArrivals.includes(p.id),
      })),
      version: "seed",
      ...ledgerSchema.parse({}),
    };
  if (result.statusCode !== 200) throw new Error("Unexpected catalog response");
  const parsed = catalogSchema.parse(await new Response(result.stream).json());
  return { ...parsed, version: storageETag(result.blob.etag) };
}

export async function saveCatalog(products: ManagedProduct[], version: string, ledger?: Ledger) {
  const current = ledger || (await readCatalog());
  if (!ledger && "version" in current && current.version !== version)
    throw new ConflictError("البيانات اتعدلت. حدّث القائمة.");
  const data = catalogSchema.parse({
    ...current,
    products: products.map((p) => {
      const stock = current.inventory[p.id]?.stock;
      return stock ? { ...p, available: stock.status === "available" } : p;
    }),
  });
  let nextVersion: string;
  try {
    const saved = await put(key, JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      ...(version === "seed"
        ? { allowOverwrite: false }
        : { allowOverwrite: true, ifMatch: version }),
    });
    nextVersion = saved.etag;
  } catch (error) {
    if (
      error instanceof BlobPreconditionFailedError ||
      (error instanceof Error && /already exists/i.test(error.message))
    )
      throw new ConflictError("البيانات اتعدلت من جلسة أخرى. حدّث القائمة قبل الحفظ.");
    throw error;
  }
  revalidateTag("clarea-catalog");
  return { ...data, version: nextVersion };
}

export const publicCatalog = unstable_cache(
  async () => {
    const catalog = await readCatalog();
    const sold = new Map<string, number>();
    for (const sale of catalog.sales)
      sold.set(sale.product_id, (sold.get(sale.product_id) || 0) + sale.quantity_sold);
    const ranks = new Map(
      catalog.products
        .filter((p) => p.published && (sold.get(p.id) || 0) > 0)
        .sort((a, b) => (sold.get(b.id) || 0) - (sold.get(a.id) || 0) || a.id.localeCompare(b.id))
        .map((p, index) => [p.id, index + 1]),
    );
    return catalog.products
      .filter((p) => p.published)
      .map((p) => {
        const stock = catalog.inventory[p.id]?.stock;
        const pricing = catalog.inventory[p.id]?.pricing;
        // Publish only the final customer price; costs, margins and history stay private.
        const clean = catalogSchema.shape.products.element.parse(p);
        const getMockDiscount = (id: string) => {
          const mod = id.charCodeAt(id.length - 1) % 4;
          if (mod === 1) return 5;
          if (mod === 2) return 10;
          if (mod === 3) return 15;
          return 0;
        };
        const appliedDiscount = pricing ? (pricing.discount > 0 ? pricing.discount : getMockDiscount(p.id)) : 0;
        
        return {
          ...clean,
          ...(pricing
            ? {
                public_price:
                  Math.round(
                    (pricing.selling_price * (1 - appliedDiscount / 100) + Number.EPSILON) * 100,
                  ) / 100,
                ...(appliedDiscount > 0
                  ? {
                      original_price: pricing.selling_price,
                      discount: appliedDiscount,
                    }
                  : {}),
              }
            : {}),
          ...(ranks.has(p.id) ? { best_seller_rank: ranks.get(p.id) } : {}),
          available: stock ? stock.status === "available" : clean.available,
          stock_status: stock?.status || (clean.available ? "available" : "out_of_stock"),
        };
      });
  },
  ["clarea-public-catalog-v5", namespace],
  { revalidate: 30, tags: ["clarea-catalog"] },
);
