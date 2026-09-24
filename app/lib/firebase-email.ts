import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, limitedJson, limitLogin, AdminError } from "./admin-auth";
import { issueCustomerSession } from "./customer-auth";
const headers = { "Cache-Control": "private, no-store" };
export function firebaseEmailConfigured() {
  return Boolean(
    process.env.FIREBASE_WEB_API_KEY &&
    (process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || "").length >= 32,
  );
}
export async function emailPassword(request: Request) {
  try {
    sameOrigin(request);
    if (!firebaseEmailConfigured())
      throw new AdminError(
        "تسجيل الإيميل غير مفعّل بعد / Email sign-in is not configured yet",
        503,
      );
    const input = z
      .object({
        action: z.enum(["signup", "signin", "resend", "reset"]),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(8).max(128).optional(),
      })
      .strict()
      .parse(await limitedJson(request, 2000));
    if (input.action !== "reset" && !input.password)
      throw new AdminError("كلمة المرور مطلوبة / Password required");
    await limitLogin(request, input.action === "signin" ? "customer-verify" : "customer-send");
    async function call(method: string, body: unknown) {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY!)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new AdminError(
          "تعذر إكمال العملية. راجعي البيانات أو حاولي لاحقاً / Check your details or try later",
          400,
        );
      return data;
    }
    if (input.action === "reset") {
      // Do not reveal whether this address owns an account.
      try {
        await call("sendOobCode", { requestType: "PASSWORD_RESET", email: input.email });
      } catch {}
      return NextResponse.json({ reset_sent: true }, { headers });
    }
    const login = await call(input.action === "signup" ? "signUp" : "signInWithPassword", {
      email: input.email,
      password: input.password,
      returnSecureToken: true,
    });
    if (typeof login.idToken !== "string") throw new Error("Missing provider token");
    if (input.action === "signup" || input.action === "resend") {
      await call("sendOobCode", { requestType: "VERIFY_EMAIL", idToken: login.idToken });
      return NextResponse.json({ verification_sent: true }, { headers });
    }
    // Only accept Google's authenticated lookup response, never a client-supplied email/token claim.
    const lookup = await call("lookup", { idToken: login.idToken });
    const user = lookup.users?.[0];
    if (
      !user ||
      user.disabled ||
      typeof user.email !== "string" ||
      user.email.toLowerCase() !== input.email
    )
      throw new AdminError("تعذر تسجيل الدخول / Unable to sign in", 401);
    if (user.emailVerified !== true)
      return NextResponse.json({ verification_required: true }, { headers });
    const response = NextResponse.json({ authenticated: true }, { headers });
    issueCustomerSession(response, user.email);
    return response;
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AdminError ? e.message : "تعذر الاتصال. حاولي مجدداً / Please try again",
      },
      { status: e instanceof AdminError ? e.status : e instanceof z.ZodError ? 400 : 503, headers },
    );
  }
}
