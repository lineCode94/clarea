import { get } from "@vercel/blob";
import { namespace } from "../../../lib/catalog-store";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
    return new Response(null, { status: 404 });
  try {
    const result = await get(`${namespace}/images/${id}.webp`, { access: "private" });
    if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
