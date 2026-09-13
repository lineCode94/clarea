import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { sameOrigin, limitedJson } from "../../lib/admin-auth";
import { publicCatalog, namespace, storageETag } from "../../lib/catalog-store";
import { chatInput, fallback, generateReply, localOnly, privateReply } from "../../lib/gemini-chat";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function enabled() {
  return (
    process.env.GEMINI_ENABLED === "true" &&
    !!process.env.GEMINI_API_KEY &&
    !!process.env.ADMIN_SESSION_SECRET &&
    !!process.env.BLOB_READ_WRITE_TOKEN
  );
}
export function GET() {
  return NextResponse.json({ enabled: enabled() }, { headers });
}
async function allow(request: Request) {
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
  const identity = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)
    .update("chat:" + ip)
    .digest("hex");
  // Fixed keys keep storage bounded; atomic counters work across serverless instances.
  for (const [id, limit, duration] of [
    [identity, 10, 3600000],
    ["global", 40, 86400000],
  ] as const) {
    const key = `${namespace}/chat-limits/${id}.json`;
    let saved = false;
    for (let i = 0; i < 4; i++) {
      const old = await get(key, { access: "private", useCache: false });
      if (old && old.statusCode !== 200) return false;
      const previous = old ? await new Response(old.stream).json() : null;
      const state =
        previous && previous.until > Date.now()
          ? previous
          : { count: 0, until: Date.now() + duration };
      if (state.count >= limit) return false;
      try {
        await put(key, JSON.stringify({ count: state.count + 1, until: state.until }), {
          access: "private",
          addRandomSuffix: false,
          contentType: "application/json",
          ...(old
            ? { allowOverwrite: true, ifMatch: storageETag(old.blob.etag) }
            : { allowOverwrite: false }),
        });
        saved = true;
        break;
      } catch (e) {
        if (
          !(e instanceof BlobPreconditionFailedError) &&
          !(e instanceof Error && /already exists|precondition/i.test(e.message))
        )
          return false;
      }
    }
    if (!saved) return false;
  }
  return true;
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  }
  let input;
  try {
    input = chatInput.parse(await limitedJson(request, 4000));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  }
  if (localOnly(input.message)) return NextResponse.json(privateReply(input.lang), { headers });
  try {
    if (!enabled() || !(await allow(request)))
      return NextResponse.json(fallback(input.lang), { headers });
    return NextResponse.json(await generateReply(input, await publicCatalog()), { headers });
  } catch {
    return NextResponse.json(fallback(input.lang), { headers });
  }
}
