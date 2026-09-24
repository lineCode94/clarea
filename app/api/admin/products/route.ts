import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, sameOrigin, limitedJson, AdminError } from "../../../lib/admin-auth";
import { readCatalog, saveCatalog, ConflictError } from "../../../lib/catalog-store";
import { managedProductSchema } from "../../../lib/catalog-schema";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
import { inventoryRows } from "../../../lib/inventory-service";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const catalog = await readCatalog();
    return NextResponse.json(
      new URL(request.url).searchParams.get("view") === "inventory"
        ? inventoryRows(catalog)
        : { products: catalog.products, version: catalog.version },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const { product, version, create } = z
      .object({ product: managedProductSchema, version: z.string().max(200), create: z.boolean() })
      .parse(await limitedJson(request));
    const current = await readCatalog();
    if (version !== current.version)
      throw new ConflictError("البيانات اتعدلت. حدّث القائمة ثم حاول مرة أخرى.");
    const exists = current.products.some((p) => p.id === product.id);
    if (create === exists)
      throw new AdminError(create ? "المنتج موجود بالفعل" : "المنتج غير موجود", 409);
    const products = create
      ? [product, ...current.products]
      : current.products.map((p) => (p.id === product.id ? product : p));
    const saved = await saveCatalog(products, version);
    return NextResponse.json({ products: saved.products, version: saved.version });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const { id, version } = z
      .object({ id: z.string().min(1).max(100), version: z.string().max(200) })
      .strict()
      .parse(await limitedJson(request));
    const current = await readCatalog();
    if (version !== current.version)
      throw new ConflictError("البيانات اتعدلت. حدّث القائمة ثم حاول مرة أخرى.");
    if (!current.products.some((p) => p.id === id)) throw new AdminError("المنتج غير موجود", 404);
    if (
      current.orders.some(
        (o) =>
          !["delivered", "cancelled"].includes(o.status) &&
          o.items.some((i) => i.product_id === id),
      )
    )
      throw new AdminError(
        "المنتج موجود في طلبات لم تنتهِ. أكملها أو ألغِها قبل الحذف، أو اخفِ المنتج مؤقتاً.",
        409,
      );
    // Keep immutable order/sales snapshots, accounting and image assets intact.
    const saved = await saveCatalog(
      current.products.filter((p) => p.id !== id),
      version,
      current,
    );
    return NextResponse.json({ products: saved.products, version: saved.version });
  } catch (error) {
    return failure(error);
  }
}
