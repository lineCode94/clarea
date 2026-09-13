import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, requireAdmin, limitedJson } from "../../../lib/admin-auth";
import { findReward, redeemReward } from "../../../lib/rewards-server";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
// POST keeps codes and phone numbers out of URL/query access logs.
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const input = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("check"), code: z.string().max(100) }),
        z.object({
          action: z.literal("redeem"),
          code: z.string().max(100),
          phone: z.string().max(40),
          orderReference: z.string().trim().min(1).max(120),
        }),
      ])
      .parse(await limitedJson(request, 3000));
    if (input.action === "redeem")
      return NextResponse.json(await redeemReward(input.code, input.phone, input.orderReference), {
        headers: { "Cache-Control": "no-store" },
      });
    const result = await findReward(input.code);
    return NextResponse.json(
      { status: result.status, ...("award" in result ? { award: result.award } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
