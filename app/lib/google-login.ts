import "server-only";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueCustomerSession } from "./customer-auth";
import { googleLoginConfigured, customerSiteOrigin } from "./google-login-config";
const flowCookie = "clarea_google_flow";
function signature(body: string) {
  return createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET!)
    .update("clarea-google-flow-v1:" + body)
    .digest("hex");
}
function same(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function client() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: customerSiteOrigin() + "/api/account/google/callback",
  });
}
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/account/google",
};
function finish(reason?: string) {
  const response = NextResponse.redirect(
    customerSiteOrigin() + "/account" + (reason ? "?login=" + reason : ""),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(flowCookie, "", { ...options, maxAge: 0 });
  return response;
}
export async function startGoogle() {
  if (!googleLoginConfigured()) return finish("unavailable");
  const state = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ state, nonce, verifier, expires: Date.now() + 600000 }),
  ).toString("base64url");
  const url = client().generateAuthUrl({
    scope: ["openid", "email"],
    response_type: "code",
    state,
    nonce,
    prompt: "select_account",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: CodeChallengeMethod.S256,
  });
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(flowCookie, body + "." + signature(body), { ...options, maxAge: 600 });
  return response;
}
export async function finishGoogle(request: Request) {
  try {
    if (!googleLoginConfigured()) return finish("unavailable");
    const query = new URL(request.url).searchParams;
    const raw = (await cookies()).get(flowCookie)?.value;
    if (!raw || raw.length > 2000) return finish("failed");
    const [body, sig, extra] = raw.split(".");
    if (extra || !sig || !same(sig, signature(body))) return finish("failed");
    const flow = z
      .object({
        state: z.string().length(43),
        nonce: z.string().length(43),
        verifier: z.string().length(43),
        expires: z.number(),
      })
      .parse(JSON.parse(Buffer.from(body, "base64url").toString()));
    if (
      flow.expires <= Date.now() ||
      flow.expires > Date.now() + 600000 ||
      !same(query.get("state") || "", flow.state)
    )
      return finish("failed");
    if (query.has("error")) return finish("cancelled");
    const code = query.get("code");
    if (!code || code.length > 4096) return finish("failed");
    const oauth = client();
    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: flow.verifier,
      redirect_uri: customerSiteOrigin() + "/api/account/google/callback",
    });
    if (!tokens.id_token) return finish("failed");
    // Official verifier checks Google's signature, issuer, audience and expiry.
    const ticket = await oauth.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const claims = z
      .object({
        sub: z.string().min(1),
        email: z.string().email(),
        email_verified: z.literal(true),
        nonce: z.string(),
      })
      .parse(ticket.getPayload());
    if (!same(claims.nonce, flow.nonce)) return finish("failed");
    const response = finish();
    issueCustomerSession(response, claims.email);
    return response;
  } catch {
    return finish("failed");
  }
}
