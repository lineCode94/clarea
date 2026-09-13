import "server-only";
import { createHmac, randomBytes, randomInt } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { rewardsConfig } from "../config/rewards";
import { namespace, storageETag } from "./catalog-store";
import { AdminError } from "./admin-auth";

type Award = {
  campaign: string;
  phone: string;
  prizeId: string;
  reference: string | null;
  requestId: string;
  issuedAt: string;
  usedAt: string | null;
  orderReference: string | null;
  attempts: number;
};
const root = `${namespace}/rewards/${rewardsConfig.campaignId}`;
function hash(value: string) {
  const secret = process.env.REWARDS_SECRET;
  if (!secret || secret.length < 32) throw new AdminError("خدمة الهدايا غير مهيأة", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function normalizePhone(input: string) {
  let value = input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s()+-]/g, "");
  if (value.startsWith("0020")) value = "0" + value.slice(4);
  else if (value.startsWith("20")) value = "0" + value.slice(2);
  if (!/^01[0125]\d{8}$/.test(value))
    throw new AdminError("أدخلي رقم موبايل مصري صحيح / Enter a valid Egyptian mobile number", 400);
  return "+20" + value.slice(1);
}
async function read<T>(key: string): Promise<{ data: T; etag: string } | null> {
  const result = await get(key, { access: "private", useCache: false });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("Storage unavailable");
  return {
    data: (await new Response(result.stream).json()) as T,
    etag: storageETag(result.blob.etag),
  };
}
function conflict(error: unknown) {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error && /already exists|precondition/i.test(error.message))
  );
}
async function write(key: string, data: unknown, etag?: string) {
  return put(key, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
  });
}
export async function limitRewardRequests(request: Request) {
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
  for (const [identity, maximum] of [
    [hash("ip:" + ip), 15],
    ["global", 300],
  ] as const) {
    const key = `${namespace}/reward-limits/${identity}.json`;
    let complete = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const old = await read<{ count: number; until: number }>(key);
      const state =
        old && old.data.until > Date.now() ? old.data : { count: 0, until: Date.now() + 900000 };
      if (state.count >= maximum)
        throw new AdminError(
          "محاولات كثيرة. حاولي بعد 15 دقيقة / Please try again in 15 minutes",
          429,
        );
      try {
        await write(key, { ...state, count: state.count + 1 }, old?.etag);
        complete = true;
        break;
      } catch (error) {
        if (!conflict(error)) throw error;
      }
    }
    if (!complete) throw new AdminError("حاولي مرة أخرى / Please retry", 429);
  }
}
export async function issueReward(inputPhone: string, requestId: string) {
  const phone = normalizePhone(inputPhone);
  const key = `${root}/phones/${hash("phone:" + phone)}.json`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const old = await read<Award>(key);
    // Repeated delivery of the same request never creates a second spin.
    if (old && (old.data.reference || old.data.requestId === requestId))
      return publicAward(old.data);
    const prize = rewardsConfig.prizes[randomInt(rewardsConfig.prizes.length)];
    const reference =
      prize.id === "try-again" ? null : `CL2-${randomBytes(12).toString("hex").toUpperCase()}`;
    const award: Award = {
      campaign: rewardsConfig.campaignId,
      phone,
      prizeId: prize.id,
      reference,
      requestId,
      issuedAt: new Date().toISOString(),
      usedAt: null,
      orderReference: null,
      attempts: (old?.data.attempts || 0) + 1,
    };
    // An index is not sufficient for validation: verification also checks the
    // canonical phone record. Orphan indexes from failed concurrent writes are invalid.
    if (reference) await write(`${namespace}/reward-codes/${reference}.json`, { key });
    try {
      await write(key, award, old?.etag);
      return publicAward(award);
    } catch (error) {
      if (!conflict(error)) throw error;
    }
  }
  throw new AdminError("حاولي مرة أخرى / Please retry", 409);
}
function publicAward(award: Award) {
  return {
    campaign: award.campaign,
    phone: award.phone,
    prizeId: award.prizeId,
    reference: award.reference,
  };
}
export function normalizeCode(input: string) {
  return input.trim().toUpperCase();
}
export async function findReward(input: string) {
  const code = normalizeCode(input);
  if (/^CL-[A-F0-9]{12}$/.test(code)) return { status: "legacy" as const };
  if (!/^CL2-[A-F0-9]{24}$/.test(code)) return { status: "invalid" as const };
  const index = await read<{ key: string }>(`${namespace}/reward-codes/${code}.json`);
  if (!index || !index.data.key.startsWith(`${namespace}/rewards/`))
    return { status: "invalid" as const };
  const record = await read<Award>(index.data.key);
  if (
    !record ||
    record.data.reference !== code ||
    !rewardsConfig.prizes.some((p) => p.id === record.data.prizeId)
  )
    return { status: "invalid" as const };
  return {
    status: record.data.usedAt
      ? ("used" as const)
      : record.data.campaign !== rewardsConfig.campaignId
        ? ("inactive" as const)
        : ("valid" as const),
    award: record.data,
    key: index.data.key,
    etag: record.etag,
  };
}
export async function redeemReward(code: string, inputPhone: string, orderReference: string) {
  const result = await findReward(code);
  if (result.status !== "valid" || !("award" in result))
    throw new AdminError(
      result.status === "used" ? "الكود اتستخدم بالفعل" : "الكود غير قابل للاستخدام التلقائي",
      409,
    );
  if (result.award.phone !== normalizePhone(inputPhone))
    throw new AdminError("رقم العميل لا يطابق الرقم المسجل للكود", 409);
  const award = { ...result.award, usedAt: new Date().toISOString(), orderReference };
  try {
    await write(result.key, award, result.etag);
  } catch (error) {
    if (conflict(error))
      throw new AdminError("الكود اتغير أو اتستخدم من جلسة تانية. افحصيه مجددًا.", 409);
    throw error;
  }
  return { status: "used" as const, award };
}
