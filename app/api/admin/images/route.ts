import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdmin, sameOrigin, AdminError } from "../../../lib/admin-auth";
import { failure } from "../../../lib/admin-response";
import { namespace } from "../../../lib/catalog-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const max = 3 * 1024 * 1024;
    if (Number(request.headers.get("content-length") || 0) > max + 20000)
      throw new AdminError("الصورة أكبر من 3 ميجابايت", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AdminError("ارفع صورة");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max + 20000) {
        await reader.cancel();
        throw new AdminError("الصورة أكبر من 3 ميجابايت", 413);
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > max ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new AdminError("استخدم صورة JPG أو PNG أو WebP حتى 3 ميجابايت");
    let output: Buffer;
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40000000,
        animated: false,
      });
      const meta = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format || "")) throw new Error("Invalid image");
      output = await image
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new AdminError("ملف الصورة غير صالح أو أبعاده كبيرة جدًا");
    }
    const id = randomUUID();
    await put(`${namespace}/images/${id}.webp`, output, {
      access: "private",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: `/api/product-images/${id}` });
  } catch (error) {
    return failure(error);
  }
}
