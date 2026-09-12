import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  cookieName,
  createSession,
  isAdmin,
  limitedJson,
  limitLogin,
  passwordMatches,
  sameOrigin,
  AdminError,
} from "../../../lib/admin-auth";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json(
    { authenticated: await isAdmin() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { password } = z
      .object({ password: z.string().min(1).max(256) })
      .parse(await limitedJson(request, 2000));
    await limitLogin(request);
    if (!passwordMatches(password)) throw new AdminError("كلمة المرور غير صحيحة", 401);
    (await cookies()).set(cookieName, createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 43200,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    (await cookies()).delete(cookieName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
