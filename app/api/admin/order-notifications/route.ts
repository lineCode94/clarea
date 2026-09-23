import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/admin-auth";
import { readCatalog } from "../../../lib/catalog-store";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdmin();
    const c = await readCatalog();
    const pending = c.orders.filter((o) => o.source === "storefront" && o.status === "pending");
    return NextResponse.json(
      {
        count: pending.length,
        orders: pending
          .slice()
          .reverse()
          .map((o) => ({ reference: o.reference, created_at: o.created_at })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
