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
    return catalog.products
      .filter((p) => p.published)
      .map((p) => {
        const stock = catalog.inventory[p.id]?.stock;
        // Explicit public projection: private inventory/prices/history never leave the server.
        const clean = catalogSchema.shape.products.element.parse(p);
        return {
          ...clean,
          available: stock ? stock.status === "available" : clean.available,
          stock_status: stock?.status || (clean.available ? "available" : "out_of_stock"),
        };
      });
  },
  ["clarea-public-catalog-v2", namespace],
  { revalidate: 30, tags: ["clarea-catalog"] },
);
