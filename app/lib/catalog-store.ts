import "server-only";
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

export async function readCatalog(): Promise<{ products: ManagedProduct[]; version: string }> {
  const result = await get(key, { access: "private", useCache: false });
  if (!result)
    return {
      products: seed.map((p) => ({
        ...p,
        published: true,
        newArrival: homeCollections.newArrivals.includes(p.id),
      })),
      version: "seed",
    };
  if (result.statusCode !== 200) throw new Error("Unexpected catalog response");
  const parsed = catalogSchema.parse(await new Response(result.stream).json());
  return { products: parsed.products, version: storageETag(result.blob.etag) };
}

export async function saveCatalog(products: ManagedProduct[], version: string) {
  const data = catalogSchema.parse({ products });
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
  return { products: data.products, version: nextVersion };
}

export const publicCatalog = unstable_cache(
  async () => {
    const catalog = await readCatalog();
    return catalog.products.filter((p) => p.published);
  },
  ["clarea-public-catalog", namespace],
  { revalidate: 30, tags: ["clarea-catalog"] },
);
