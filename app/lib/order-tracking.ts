import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readCatalog } from "./catalog-store";
import { sameOrigin, limitedJson, AdminError } from "./admin-auth";
import type { Order } from "./order-schema";
function signature(id: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new AdminError("Tracking unavailable", 503);
  // Domain separation prevents use as an admin session signature.
  return createHmac("sha256", secret)
    .update("clarea-order-tracking-v1:" + id)
    .digest("hex");
}
export function trackingPath(order: Pick<Order, "id">) {
  return `/track#${order.id}.${signature(order.id)}`;
}
export function withTracking(order: Order) {
  return { ...order, tracking_path: trackingPath(order) };
}
export async function trackOrder(request: Request) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
  };
  try {
    sameOrigin(request);
    const input = await limitedJson(request, 512);
    const token = typeof input?.token === "string" ? input.token : "";
    const match = /^([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
    if (!match || !timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature(match[1]))))
      return NextResponse.json({ error: "Invalid tracking link" }, { status: 404, headers });
    const c = await readCatalog(),
      order = c.orders.find((o) => o.id === match[1]);
    if (!order)
      return NextResponse.json({ error: "Invalid tracking link" }, { status: 404, headers });
    // No identity, address, phone, notes, costs or private ledger data leave this endpoint.
    return NextResponse.json(
      { order: { reference: order.reference, status: order.status, updated_at: order.updated_at } },
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Unable to load tracking" },
      { status: e instanceof AdminError ? e.status : 503, headers },
    );
  }
}
