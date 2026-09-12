import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import { namespace, storageETag } from "./catalog-store";

export const cookieName = "clarea_admin";
export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function secret() {
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32)
    throw new AdminError("الإدارة غير مهيأة", 503);
  return process.env.ADMIN_SESSION_SECRET;
}
function equal(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function passwordMatches(password: string) {
  const [salt, hash] = (process.env.ADMIN_PASSWORD_HASH || "").split(":");
  if (!salt || !hash) throw new AdminError("الإدارة غير مهيأة", 503);
  return equal(scryptSync(password, salt, 64).toString("hex"), hash);
}
export function createSession() {
  const body = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 12 * 60 * 60 * 1000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value || value.length > 1000) return false;
  try {
    const [body, signature, extra] = value.split(".");
    if (
      extra ||
      !signature ||
      !equal(signature, createHmac("sha256", secret()).update(body).digest("base64url"))
    )
      return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return (
      typeof payload.exp === "number" &&
      payload.exp > Date.now() &&
      payload.exp <= Date.now() + 12 * 60 * 60 * 1000
    );
  } catch {
    return false;
  }
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new AdminError("سجّل الدخول أولًا", 401);
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AdminError("طلب غير مسموح", 403);
}
export async function limitedJson(request: Request, max = 60000) {
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError("طلب فارغ");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new AdminError("الطلب أكبر من المسموح", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new AdminError("بيانات غير صحيحة");
  }
}
// Persist limits in private storage; conditional writes prevent parallel bypasses.
export async function limitLogin(request: Request) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "local";
  const identity = createHmac("sha256", secret()).update(ip).digest("hex");
  for (const [id, limit] of [
    [identity, 10],
    ["global", 100],
  ] as const) {
    const path = `${namespace}/auth/attempts-${id}.json`;
    let saved = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await get(path, { access: "private", useCache: false });
      const old = result?.statusCode === 200 ? await new Response(result.stream).json() : null;
      const state =
        old && old.until > Date.now() ? old : { count: 0, until: Date.now() + 15 * 60 * 1000 };
      if (state.count >= limit) throw new AdminError("محاولات كثيرة. حاول بعد 15 دقيقة.", 429);
      try {
        await put(path, JSON.stringify({ ...state, count: state.count + 1 }), {
          access: "private",
          addRandomSuffix: false,
          ...(result
            ? { allowOverwrite: true, ifMatch: storageETag(result.blob.etag) }
            : { allowOverwrite: false }),
        });
        saved = true;
        break;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
    if (!saved) throw new AdminError("حاول لاحقًا", 429);
  }
}
