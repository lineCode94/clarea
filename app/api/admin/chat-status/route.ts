import { NextResponse } from "next/server";
import { sameOrigin, requireAdmin } from "../../../lib/admin-auth";
import { failure } from "../../../lib/admin-response";
export const runtime = "nodejs";
// Owner-only operational probe. No configuration values, prompts or provider
// error messages are returned. It cannot accept arbitrary upstream requests.
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
  } catch (e) {
    return failure(e);
  }
  const headers = { "Cache-Control": "private, no-store" };
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  if (!key || !/^[a-z0-9.-]+$/.test(model))
    return NextResponse.json({ configured: false }, { headers });
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with OK." }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      },
    );
    const data = await response.json();
    const quota = (data.error?.details || [])
      .flatMap(
        (detail: { violations?: { quotaId?: string; quotaValue?: string }[] }) =>
          detail.violations || [],
      )
      .slice(0, 8)
      .map((v: { quotaId?: string; quotaValue?: string }) => ({
        id: String(v.quotaId || "").slice(0, 150),
        value: String(v.quotaValue || "").slice(0, 30),
      }));
    return NextResponse.json(
      {
        configured: true,
        model,
        upstreamStatus: response.status,
        providerCode: String(data.error?.status || "OK").slice(0, 60),
        finishReason: data.candidates?.[0]?.finishReason || null,
        quota,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { configured: true, model, providerCode: "CONNECTION_FAILED" },
      { headers },
    );
  }
}
