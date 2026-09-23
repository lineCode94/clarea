"use client";
import CustomerNav from "../components/layout/customer-nav";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbCheck, TbRefresh, TbPackage, TbTruck, TbX } from "react-icons/tb";
type Status = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
type Order = { reference: string; status: Status; updated_at: string };
const labels = {
  ar: {
    pending: "وصلنا طلبك",
    confirmed: "تم تأكيد طلبك",
    shipped: "طلبك في الطريق",
    delivered: "تم تسليم طلبك",
    cancelled: "تم إلغاء الطلب",
  },
  en: {
    pending: "Order received",
    confirmed: "Order confirmed",
    shipped: "Your order is on its way",
    delivered: "Order delivered",
    cancelled: "Order cancelled",
  },
};
const descriptions = {
  ar: {
    pending: "فريق Claréa هيتواصل معاكي لتأكيد التفاصيل قبل التجهيز.",
    confirmed: "أكدنا طلبك وبنجهزه ليكي.",
    shipped: "تم شحن طلبك. مندوب التوصيل هيتواصل معاكي.",
    delivered: "شكراً لاختيارك Claréa 🤍",
    cancelled: "لأي استفسار عن الإلغاء، تواصلي مع فريق Claréa.",
  },
  en: {
    pending: "Our team will contact you to confirm the details before preparation.",
    confirmed: "Your order is confirmed and being prepared.",
    shipped: "Your order has shipped. The courier will contact you.",
    delivered: "Thank you for choosing Claréa 🤍",
    cancelled: "Contact the Claréa team if you have questions about this cancellation.",
  },
};
export default function Tracking() {
  const [lang, setLang] = useState<"ar" | "en">("ar"),
    [order, setOrder] = useState<Order | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState<"invalid" | "network" | null>(null);
  const token = useRef(""),
    active = useRef<AbortController | null>(null),
    ar = lang === "ar";
  const load = useCallback(async () => {
    if (active.current) return;
    if (!/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token.current)) {
      setOrder(null);
      setError("invalid");
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch("/api/orders/track", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current }),
        signal: controller.signal,
      });
      if (active.current !== controller) return;
      if (r.status === 404) {
        setOrder(null);
        setError("invalid");
        return;
      }
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (active.current !== controller) return;
      if (!Object.hasOwn(labels.ar, data.order?.status)) throw new Error();
      setOrder(data.order);
      setError(null);
    } catch {
      if (active.current === controller) setError("network");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }, []);
  useEffect(() => {
    const read = () => {
      active.current?.abort();
      active.current = null;
      setOrder(null);
      token.current = window.location.hash.slice(1);
      void load();
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    read();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("hashchange", read);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active.current?.abort();
      active.current = null;
      clearInterval(timer);
      window.removeEventListener("hashchange", read);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  const stages = ["pending", "confirmed", "shipped", "delivered"] as const,
    current = order ? stages.findIndex((s) => s === order.status) : -1;
  return (
    <main
      lang={lang}
      dir={ar ? "rtl" : "ltr"}
      className="min-h-dvh bg-[#F5E9E2]/50 px-4 py-8 text-[#5C1A2B] sm:py-14"
    >
      <div className="mx-auto max-w-lg">
        <CustomerNav ar={ar} />
        <button
          className="mb-4 min-h-11 px-4 text-sm underline"
          onClick={() => setLang(ar ? "en" : "ar")}
        >
          {ar ? "English" : "العربية"}
        </button>
        <section className="rounded-3xl border border-[#e5d7cd] bg-white p-6 shadow-sm sm:p-8">
          <h1 className="m-0 text-2xl">{ar ? "متابعة طلبك" : "Track your order"}</h1>
          <div aria-live="polite" aria-atomic="true">
            {busy && !order && !error && (
              <p className="py-8 text-sm">
                {ar ? "جاري تحميل حالة الطلب…" : "Loading your order…"}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-[#F5E9E2]/70 p-4 text-sm leading-7">
                {error === "invalid"
                  ? ar
                    ? "رابط المتابعة غير صحيح. افتحي الرابط الموجود في رسالة طلبك، أو اطلبيه من فريق Claréa."
                    : "This tracking link is invalid. Open the link from your order message, or ask the Claréa team for it."
                  : ar
                    ? "تعذر تحديث الحالة. تأكدي من اتصال الإنترنت وحاولي مجدداً."
                    : "Couldn’t update your order. Check your connection and try again."}
              </p>
            )}
            {order && (
              <>
                <p dir="ltr" className="my-5 select-all text-start text-sm text-[#917c73]">
                  {order.reference}
                </p>
                <div className="my-6 grid size-16 place-items-center rounded-full bg-[#F5E9E2] text-[#C9A05C]">
                  {order.status === "cancelled" ? (
                    <TbX size={30} />
                  ) : order.status === "shipped" ? (
                    <TbTruck size={30} />
                  ) : order.status === "delivered" ? (
                    <TbCheck size={30} />
                  ) : (
                    <TbPackage size={30} />
                  )}
                </div>
                <h2 className="text-xl">{labels[lang][order.status]}</h2>
                <p className="text-sm leading-7 text-[#766760]">
                  {descriptions[lang][order.status]}
                </p>
              </>
            )}
          </div>
          {order && (
            <>
              {order.status !== "cancelled" && (
                <ol className="my-8 list-none space-y-0 p-0">
                  {stages.map((s, i) => (
                    <li
                      key={s}
                      aria-current={i === current ? "step" : undefined}
                      className="flex min-h-14 items-center gap-4"
                    >
                      <span
                        className={
                          "grid size-8 shrink-0 place-items-center rounded-full border " +
                          (i <= current
                            ? "border-[#5C1A2B] bg-[#5C1A2B] text-white"
                            : "border-[#e5d7cd] text-[#ad9c92]")
                        }
                      >
                        {i < current ? <TbCheck /> : i + 1}
                      </span>
                      <span
                        className={
                          i <= current ? "text-sm font-semibold" : "text-sm text-[#917c73]"
                        }
                      >
                        {labels[lang][s]}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-5 text-xs text-[#917c73]">
                {ar ? "آخر تغيير للحالة: " : "Last status change: "}
                {new Date(order.updated_at).toLocaleString(ar ? "ar-EG" : "en-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Cairo",
                })}
              </p>
            </>
          )}
          {error !== "invalid" && (
            <button
              disabled={busy}
              onClick={() => void load()}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5C1A2B] px-4 py-3 text-white disabled:opacity-50"
            >
              <TbRefresh className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
              {ar ? "تحديث الحالة" : "Refresh status"}
            </button>
          )}
          <p className="mt-4 text-center text-xs leading-6 text-[#917c73]">
            {ar
              ? "احتفظي بالرابط لمتابعة طلبك. الحالة بتتحدث تلقائياً أثناء فتح الصفحة."
              : "Keep this link to track your order. Status updates while this page is open."}
          </p>
        </section>
        <a
          href="/"
          className="mt-6 flex min-h-11 items-center justify-center text-sm underline underline-offset-4"
        >
          {ar ? "العودة للمتجر" : "Back to the store"}
        </a>
      </div>
    </main>
  );
}
