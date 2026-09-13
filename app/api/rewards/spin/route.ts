import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, limitedJson } from "../../../lib/admin-auth";
import { issueReward, limitRewardRequests, normalizePhone } from "../../../lib/rewards-server";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = z
      .object({ phone: z.string().max(40), requestId: z.string().uuid() })
      .strict()
      .parse(await limitedJson(request, 2000));
    normalizePhone(data.phone);
    await limitRewardRequests(request);
    return NextResponse.json(await issueReward(data.phone, data.requestId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
