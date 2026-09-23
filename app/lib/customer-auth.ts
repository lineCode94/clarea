import "server-only";
import { googleLoginConfigured } from "./google-login-config";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { z } from "zod";
import { namespace, storageETag, readCatalog } from "./catalog-store";
import { sameOrigin, limitedJson, limitLogin, AdminError } from "./admin-auth";
import { trackingPath } from "./order-tracking";
const cookieName = "clarea_customer",
  duration = 7 * 24 * 60 * 60;
const headers = { "Cache-Control": "private, no-store" };
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
function secret() {
  const key = process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!key || key.length < 32) throw new AdminError("خدمة الدخول غير مهيأة", 503);
  return key;
}
function sign(value: string) {
  return createHmac("sha256", secret())
    .update("clarea-customer-v1:" + value)
    .digest("hex");
}
function equal(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function emailLoginConfigured() {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.CUSTOMER_EMAIL_FROM &&
    (process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || "").length >= 32
  );
}
export function issueCustomerSession(response: NextResponse, email: string) {
  const body = Buffer.from(
    JSON.stringify({
      email: emailSchema.parse(email),
      exp: Date.now() + duration * 1000,
      nonce: randomUUID(),
    }),
  ).toString("base64url");
  response.cookies.set(cookieName, body + "." + sign(body), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: duration,
  });
}
export async function customerEmail() {
  try {
    const value = (await cookies()).get(cookieName)?.value;
    if (!value || value.length > 1500) return null;
    const [body, signature, extra] = value.split(".");
    if (extra || !signature || !equal(signature, sign(body))) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      typeof data.exp !== "number" ||
      data.exp <= Date.now() ||
      data.exp > Date.now() + duration * 1000
    )
      return null;
    return emailSchema.parse(data.email);
  } catch {
    return null;
  }
}
const fail = (e: unknown) =>
  NextResponse.json(
    {
      error:
        e instanceof AdminError ? e.message : "تعذر إكمال الطلب. راجعي البيانات وحاولي مجدداً.",
    },
    { status: e instanceof AdminError ? e.status : e instanceof z.ZodError ? 400 : 503, headers },
  );
export async function sendCode(request: Request) {
  try {
    sameOrigin(request);
    const { email } = z
      .object({ email: emailSchema })
      .strict()
      .parse(await limitedJson(request, 2000));
    if (!emailLoginConfigured())
      throw new AdminError(
        "تسجيل الدخول بالإيميل غير متاح حالياً. رابط متابعة الطلب يعمل بدون تسجيل.",
        503,
      );
    await limitLogin(request, "customer-send");
    const key = namespace + "/customer-auth/" + sign(email) + ".json",
      old = await get(key, { access: "private", useCache: false });
    const state = old?.statusCode === 200 ? await new Response(old.stream).json() : null;
    if (state?.created > Date.now() - 60000)
      throw new AdminError("انتظري دقيقة قبل طلب كود جديد.", 429);
    const id = randomUUID(),
      code = String(randomInt(100000, 1000000)),
      created = Date.now();
    try {
      await put(
        key,
        JSON.stringify({
          id,
          created,
          expires: created + 10 * 60 * 1000,
          attempts: 0,
          used: false,
          hash: sign(email + ":" + id + ":" + code),
        }),
        {
          access: "private",
          addRandomSuffix: false,
          ...(old
            ? { allowOverwrite: true, ifMatch: storageETag(old.blob.etag) }
            : { allowOverwrite: false }),
        },
      );
    } catch {
      throw new AdminError("تم طلب كود مؤخراً. انتظري دقيقة وحاولي مجدداً.", 429);
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify({
        from: process.env.CUSTOMER_EMAIL_FROM,
        to: [email],
        subject: "Claréa — كود تسجيل الدخول",
        text:
          "كود تسجيل الدخول إلى Claréa: " +
          code +
          "\nصالح لمدة 10 دقائق. لا تشاركيه مع أحد. إذا لم تطلبي تسجيل الدخول تجاهلي الرسالة.",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new AdminError("تعذر إرسال الكود حالياً. حاولي بعد دقيقة.", 503);
    return NextResponse.json({ sent: true, challenge: id }, { headers });
  } catch (e) {
    return fail(e);
  }
}
export async function verifyCode(request: Request) {
  try {
    sameOrigin(request);
    const { email, code, challenge } = z
      .object({
        email: emailSchema,
        code: z.string().regex(/^\d{6}$/),
        challenge: z.string().uuid(),
      })
      .strict()
      .parse(await limitedJson(request, 2000));
    await limitLogin(request, "customer-verify");
    const key = namespace + "/customer-auth/" + sign(email) + ".json";
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await get(key, { access: "private", useCache: false });
      const state = result?.statusCode === 200 ? await new Response(result.stream).json() : null;
      if (
        !state ||
        state.id !== challenge ||
        state.used ||
        state.expires <= Date.now() ||
        state.attempts >= 5
      )
        throw new AdminError("الكود غير صحيح أو منتهي. اطلبي كوداً جديداً.", 400);
      const valid = equal(state.hash, sign(email + ":" + challenge + ":" + code));
      try {
        await put(key, JSON.stringify({ ...state, attempts: state.attempts + 1, used: valid }), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          ifMatch: storageETag(result!.blob.etag),
        });
      } catch {
        if (attempt < 2) continue;
        throw new AdminError("حاولي مرة أخرى", 409);
      }
      if (!valid) throw new AdminError("الكود غير صحيح. راجعي الرسالة.", 400);
      const response = NextResponse.json({ verified: true }, { headers });
      issueCustomerSession(response, email);
      return response;
    }
  } catch (e) {
    return fail(e);
  }
}
const profileSchema = z
  .object({
    name: z.string().trim().max(120),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((v) => !v || /^(?:\+?20|0)1[0125]\d{8}$/.test(v), "أدخلي رقم موبايل مصري صحيح"),
    address: z.string().trim().max(500),
  })
  .strict();
async function readProfile(email: string) {
  const key = namespace + "/customer-profiles/" + sign(email) + ".json";
  const result = await get(key, { access: "private", useCache: false });
  if (!result) return { key, profile: { name: "", phone: "", address: "" }, version: "new" };
  if (result.statusCode !== 200) throw new Error("Profile unavailable");
  return {
    key,
    profile: profileSchema.parse(await new Response(result.stream).json()),
    version: storageETag(result.blob.etag),
  };
}
export async function updateProfile(request: Request) {
  try {
    sameOrigin(request);
    const email = await customerEmail();
    if (!email) throw new AdminError("سجّلي الدخول أولاً", 401);
    const input = z
      .object({ profile: profileSchema, version: z.string().min(1).max(200) })
      .strict()
      .parse(await limitedJson(request, 4000));
    const current = await readProfile(email);
    if (current.version !== input.version)
      throw new AdminError("البيانات اتعدلت من صفحة أخرى. حدّثي الصفحة وحاولي مجدداً.", 409);
    try {
      await put(current.key, JSON.stringify(input.profile), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        ...(current.version === "new"
          ? { allowOverwrite: false }
          : { allowOverwrite: true, ifMatch: current.version }),
      });
    } catch {
      throw new AdminError("تعذر الحفظ. حدّثي الصفحة وحاولي مجدداً.", 409);
    }
    return NextResponse.json({ saved: true }, { headers });
  } catch (e) {
    return fail(e);
  }
}
export async function accountOrders() {
  try {
    const email = await customerEmail();
    if (!email)
      return NextResponse.json(
        {
          authenticated: false,
          configured: emailLoginConfigured(),
          google_configured: googleLoginConfigured(),
        },
        { headers },
      );
    const [c, profile] = await Promise.all([readCatalog(), readProfile(email)]);
    return NextResponse.json(
      {
        authenticated: true,
        email,
        profile: profile.profile,
        profile_version: profile.version,
        orders: c.orders
          .filter((o) => o.customer.email?.trim().toLowerCase() === email)
          .slice()
          .reverse()
          .map((o) => ({
            reference: o.reference,
            status: o.status,
            created_at: o.created_at,
            tracking_path: trackingPath(o),
            subtotal: o.revenue,
            shipping_fee: o.shipping_fee ?? null,
            items: o.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.selling_price,
              subtotal: i.revenue,
            })),
          })),
      },
      { headers },
    );
  } catch {
    return NextResponse.json({ error: "تعذر تحميل الطلبات" }, { status: 503, headers });
  }
}
export async function logout(request: Request) {
  try {
    sameOrigin(request);
    const response = NextResponse.json({ success: true }, { headers });
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return fail(e);
  }
}
