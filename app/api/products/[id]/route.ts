import { NextResponse } from "next/server";
import { publicCatalog } from "../../../lib/catalog-store";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = (await publicCatalog()).find((p) => p.id === id);
  return product
    ? NextResponse.json(product)
    : NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
}
