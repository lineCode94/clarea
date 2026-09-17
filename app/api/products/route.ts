import { NextResponse } from "next/server";
import { publicCatalog } from "../../lib/catalog-store";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await publicCatalog());
}
