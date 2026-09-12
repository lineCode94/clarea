import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, sameOrigin, limitedJson, AdminError } from "../../../lib/admin-auth";
import { readCatalog, saveCatalog, ConflictError } from "../../../lib/catalog-store";
import { managedProductSchema } from "../../../lib/catalog-schema";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await readCatalog(), { headers: { "Cache-Control": "no-store" } });
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
    return NextResponse.json(await saveCatalog(products, version));
  } catch (error) {
    return failure(error);
  }
}
