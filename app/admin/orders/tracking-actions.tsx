"use client";
import { useEffect, useState } from "react";
import { TbBrandWhatsapp, TbCopy, TbExternalLink } from "react-icons/tb";
import type { Order } from "../../lib/order-schema";
import { toast } from "./toasts";
const labels = {
  pending: "وصلنا طلبك وهنكلمك لتأكيد التفاصيل",
  confirmed: "تم تأكيد طلبك وبنجهزه ليكي",
  shipped: "تم شحن طلبك وهو في الطريق ليكي",
  delivered: "تم تسليم طلبك. شكراً لاختيارك Claréa 🤍",
  cancelled: "تم إلغاء طلبك. لو عندك أي استفسار ابعتي لنا",
};
export function whatsappNumber(value: string) {
  let phone = value
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[\s()+-]/g, "");
  if (/^01[0125]\d{8}$/.test(phone)) phone = "20" + phone.slice(1);
  if (phone.startsWith("00")) phone = phone.slice(2);
  return /^[1-9]\d{9,14}$/.test(phone) ? phone : null;
}
export default function TrackingActions({ order }: { order: Order }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!order.tracking_path?.startsWith("/track#")) return null;
  const link = origin + order.tracking_path,
    phone = whatsappNumber(order.customer.phone);
  const message = `أهلًا بيكي من Claréa ✨\nطلبك رقم ${order.reference}\n${labels[order.status]}.\nتابعي حالة طلبك من هنا:\n${link}`;
  const style =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbcac0] px-4 py-2 text-sm";
  return (
    <div className="mt-4 border-t border-[#e8ddd5] pt-4">
      <div className="flex flex-wrap gap-2">
        {phone && origin ? (
          <a
            href={"https://wa.me/" + phone + "?text=" + encodeURIComponent(message)}
            target="_blank"
            rel="noopener noreferrer"
            className={style + " bg-[#f2f8f2]"}
          >
            <TbBrandWhatsapp size={20} />
            إبلاغ العميل على واتساب
          </a>
        ) : (
          <span className="text-sm text-[#917c73]">
            رقم واتساب غير متاح — انسخي رابط المتابعة لإرساله.
          </span>
        )}
        <button
          type="button"
          disabled={!origin}
          className={style}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast.success("تم نسخ رابط المتابعة");
            } catch {
              toast.error("تعذر النسخ. افتحي المتابعة وانسخي الرابط من المتصفح.");
            }
          }}
        >
          <TbCopy />
          نسخ رابط المتابعة
        </button>
        <a href={order.tracking_path} target="_blank" rel="noopener noreferrer" className={style}>
          <TbExternalLink />
          عرض المتابعة
        </a>
      </div>
      <p className="mb-0 mt-2 text-xs text-[#917c73]">
        واتساب يفتح برسالة جاهزة حسب الحالة الحالية؛ راجعيها واضغطي إرسال.
      </p>
    </div>
  );
}
