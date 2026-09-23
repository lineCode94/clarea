"use client";
import { useEffect, useState, type FormEvent } from "react";
import CustomerNav from "../components/layout/customer-nav";
import { recentOrders, type RecentOrder } from "../lib/recent-orders";
type AccountData = {
  authenticated: boolean;
  configured?: boolean;
  email?: string;
  orders?: { reference: string; status: string; tracking_path: string }[];
};
const field = "mt-2 w-full rounded-xl border border-[#dbcac0] p-3 text-base";
const button = "min-h-12 rounded-xl bg-[#5C1A2B] px-5 py-3 text-white disabled:opacity-40";
const labels: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم تأكيده",
  shipped: "تم شحنه",
  delivered: "تم تسليمه",
  cancelled: "ملغي",
};
export default function Account() {
  const [data, setData] = useState<AccountData | null>(null),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wait, setWait] = useState(0),
    [recent, setRecent] = useState<RecentOrder[]>([]);
  async function refresh() {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل حسابك. حاولي مجدداً.");
    setData(await response.json());
  }
  useEffect(() => {
    setRecent(recentOrders());
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy || wait) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setChallenge(d.challenge);
      setCode("");
      setWait(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الإرسال");
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, challenge }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCode("");
      setChallenge("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحقق");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/account", { method: "DELETE" });
      if (!r.ok) throw new Error();
      await refresh();
    } catch {
      setError("تعذر تسجيل الخروج");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main dir="rtl" lang="ar" className="min-h-dvh bg-[#F5E9E2]/40 px-4 py-6 text-[#412832]">
      <div className="mx-auto max-w-3xl">
        <CustomerNav />
        <section className="rounded-3xl border border-[#e5d7cd] bg-white p-6 sm:p-8">
          <h1 className="m-0 text-2xl text-[#5C1A2B]">طلباتي</h1>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">
              {error}
            </p>
          )}
          {!data && !error && <p>جاري تحميل حسابك…</p>}
          {!data && error && (
            <button
              className={button}
              onClick={() => {
                setError("");
                refresh().catch((e) => setError(e.message));
              }}
            >
              إعادة المحاولة
            </button>
          )}
          {data?.authenticated ? (
            <>
              <div className="my-5 flex flex-wrap items-center justify-between gap-3">
                <p dir="ltr" className="break-all text-sm">
                  {data.email}
                </p>
                <button
                  disabled={busy}
                  className="min-h-11 underline"
                  onClick={() => void logout()}
                >
                  تسجيل الخروج
                </button>
              </div>
              <p className="text-sm text-muted">طلبات الإيميل المتحقق منه، من أي جهاز.</p>
              {data.orders?.length ? (
                <ul className="list-none space-y-3 p-0">
                  {data.orders.map((o) => (
                    <li key={o.reference}>
                      <a
                        href={o.tracking_path}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5d7cd] p-4"
                      >
                        <strong dir="ltr">{o.reference}</strong>
                        <span className="text-sm">{labels[o.status]} · متابعة الطلب ←</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="my-8 text-sm">
                  مفيش طلبات مسجلة بالإيميل ده لسه. طلباتك الجديدة أثناء تسجيل الدخول هتظهر هنا.
                </p>
              )}
            </>
          ) : (
            data && (
              <>
                <p className="my-5 text-sm leading-7">
                  سجّلي دخولك بالإيميل المستخدم في الطلب. هنبعتلك كود تحقق بدون كلمة مرور.
                </p>
                {data.configured ? (
                  <>
                    {!challenge ? (
                      <form onSubmit={send} className="space-y-4">
                        <label className="block text-sm">
                          البريد الإلكتروني
                          <input
                            required
                            type="email"
                            autoComplete="email"
                            maxLength={254}
                            dir="ltr"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={field}
                          />
                        </label>
                        <button disabled={busy || wait > 0} className={button}>
                          {busy
                            ? "جاري الإرسال…"
                            : wait > 0
                              ? "انتظري " + wait + " ثانية"
                              : "إرسال كود التحقق"}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={verify} className="space-y-4">
                        <p className="text-sm">
                          بعتنا الكود على <bdi>{email}</bdi>. صالح لمدة 10 دقائق.
                        </p>
                        <label className="block text-sm">
                          كود التحقق
                          <input
                            required
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            dir="ltr"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className={field}
                          />
                        </label>
                        <button disabled={busy} className={button}>
                          {busy ? "جاري التحقق…" : "تأكيد ودخول"}
                        </button>
                        <div className="flex gap-5 text-sm">
                          <button
                            type="button"
                            disabled={busy || wait > 0}
                            onClick={() => void send()}
                            className="min-h-11 underline disabled:opacity-40"
                          >
                            {wait > 0
                              ? "إعادة الإرسال بعد " + wait + " ثانية"
                              : "إعادة إرسال الكود"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setChallenge("");
                              setCode("");
                            }}
                            className="min-h-11 underline"
                          >
                            تغيير الإيميل
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  <p className="rounded-xl bg-[#F5E9E2] p-4 text-sm leading-7">
                    تسجيل الدخول بالإيميل بيتجهز حالياً. تقدري تتابعي طلبك بالرابط الخاص الموجود في
                    رسالة الطلب.
                  </p>
                )}
              </>
            )
          )}
          {recent.length > 0 && (
            <div className="mt-8 border-t border-[#e5d7cd] pt-5">
              <h2 className="text-lg">طلبات محفوظة على الجهاز ده</h2>
              <p className="text-xs text-muted">
                روابط المتابعة المحفوظة هنا مستقلة عن حساب الإيميل.
              </p>
              <ul className="list-none space-y-3 p-0">
                {recent.map((o) => (
                  <li key={o.reference}>
                    <a
                      href={o.tracking_path}
                      className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5E9E2]/50 px-4 py-3 text-sm"
                    >
                      <bdi>{o.reference}</bdi>
                      <span>متابعة الطلب ←</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
