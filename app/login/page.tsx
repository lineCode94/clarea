"use client";
import React, { useEffect, useState, type FormEvent } from "react";
import EmailLogin from "../account/email-login";
import { FcGoogle } from "react-icons/fc";
import CustomerNav from "../components/layout/customer-nav";
import { useLanguage } from "../hooks/use-language";
import { useRouter } from "next/navigation";

const field =
  "mt-2 w-full rounded-xl border border-[#dbcac0] bg-white p-3.5 text-sm outline-offset-4 focus:border-[#5C1A2B] focus:outline-[#C9A05C] placeholder:text-gray-400";
const button =
  "min-h-12 w-full rounded-xl bg-[#5C1A2B] px-5 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[#481422] disabled:opacity-40";

export default function LoginPage() {
  const [lang, setLang] = useLanguage("ar");
  const ar = lang === "ar";
  const router = useRouter();

  const [data, setData] = useState<any>(null),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wait, setWait] = useState(0);

  async function refresh() {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (!response.ok)
      throw new Error(
        ar ? "تعذر تحميل الصفحة. حاولي مجدداً." : "Could not load. Try again.",
      );
    const next = await response.json();
    setData(next);
    if (next.authenticated) {
      router.push("/account");
    }
    return next;
  }

  useEffect(() => {
    let initialError = "";
    const login = new URLSearchParams(window.location.search).get("login");
    if (login === "failed")
      initialError = ar
        ? "تعذر تسجيل الدخول بجوجل. حاولي مجدداً."
        : "Google login failed. Please try again.";
    if (login === "cancelled")
      initialError = ar
        ? "تم إلغاء تسجيل الدخول. تقدري تحاولي مرة أخرى."
        : "Login was cancelled. You can try again.";
    if (login === "unavailable")
      initialError = ar
        ? "تسجيل الدخول بجوجل غير متاح حالياً."
        : "Google login is currently unavailable.";

    refresh()
      .then((accData) => {
        if (!accData?.authenticated && initialError) {
          setError(initialError);
        }
      })
      .catch((e) => setError(e.message));
  }, [ar, router]);

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
      if (!r.ok) throw new Error(d.error || (ar ? "فشل الإرسال" : "Failed to send"));
      setChallenge(d.challenge);
      setCode("");
      setWait(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : ar ? "تعذر الإرسال" : "Could not send");
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
      if (!r.ok) throw new Error(d.error || (ar ? "فشل التحقق" : "Verification failed"));
      setCode("");
      setChallenge("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : ar ? "تعذر التحقق" : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      lang={ar ? "ar" : "en"}
      className={`min-h-dvh bg-[#fffdfa] text-[#412832] ${ar ? "font-arabic" : "font-sans"}`}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <CustomerNav lang={lang} onLangChange={setLang} />

        <div className="mx-auto max-w-md mt-10 rounded-3xl border border-[#e9ddd5] bg-white p-6 sm:p-10 shadow-sm">
          <header className="mb-8 text-center border-b border-[#e9ddd5] pb-6">
            <h1 className="text-2xl font-bold text-[#5C1A2B]">
              {ar ? "تسجيل الدخول" : "Sign In"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {ar
                ? "سجلي الدخول لمتابعة طلباتك المحفوظة"
                : "Sign in to track your saved orders"}
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-900 border border-red-200"
            >
              {error}
            </div>
          )}

          {!data && !error && (
            <div className="py-10 text-center text-muted">
              <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-[#e9ddd5] border-t-[#5C1A2B]"></div>
              <p>{ar ? "جاري التحميل…" : "Loading..."}</p>
            </div>
          )}

          {!data && error && (
            <div className="text-center py-10">
              <button
                className={button + " max-w-xs"}
                onClick={() => {
                  setError("");
                  refresh().catch((e) => setError(e.message));
                }}
              >
                {ar ? "إعادة المحاولة" : "Try Again"}
              </button>
            </div>
          )}

          {data && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              {data.google_configured ? (
                <a
                  href="/api/account/google"
                  className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white p-4 text-sm font-bold text-[#3c4043] shadow-sm transition-all hover:bg-gray-50 hover:shadow"
                >
                  <FcGoogle size={24} className="group-hover:scale-110 transition-transform" />
                  {ar ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
                </a>
              ) : null}

              {(data.configured || data.firebase_configured) && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-[#e9ddd5]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs font-semibold text-muted uppercase">
                      {ar ? "أو باستخدام البريد الإلكتروني" : "Or use email"}
                    </span>
                  </div>
                </div>
              )}
              
              {data.firebase_configured && (
                <EmailLogin
                  ar={ar}
                  onSuccess={() => {
                    refresh().catch((e) => setError(e.message));
                  }}
                />
              )}

              {data.configured && !data.firebase_configured ? (
                <>
                  {!challenge ? (
                    <form onSubmit={send} className="space-y-4">
                      <div>
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          dir="ltr"
                          placeholder={ar ? "البريد الإلكتروني" : "Email address"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={field}
                        />
                      </div>
                      <button disabled={busy || wait > 0} className={button}>
                        {busy
                          ? ar
                            ? "جاري الإرسال…"
                            : "Sending..."
                          : wait > 0
                            ? ar
                              ? `انتظري ${wait} ثانية`
                              : `Wait ${wait}s`
                            : ar
                              ? "إرسال كود التحقق"
                              : "Send Login Code"}
                      </button>
                    </form>
                  ) : (
                    <form
                      onSubmit={verify}
                      className="space-y-5 rounded-2xl bg-[#F5E9E2]/30 p-6 border border-[#e9ddd5]"
                    >
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">
                          {ar ? "أرسلنا كود التحقق إلى:" : "We sent a code to:"}
                        </p>
                        <p dir="ltr" className="text-sm font-bold text-[#5C1A2B]">
                          {email}
                        </p>
                      </div>

                      <div>
                        <input
                          required
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          dir="ltr"
                          placeholder="000000"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                          className={field + " text-center text-2xl tracking-[0.5em] font-bold"}
                        />
                      </div>
                      <button disabled={busy || code.length !== 6} className={button}>
                        {busy
                          ? ar
                            ? "جاري التحقق…"
                            : "Verifying..."
                          : ar
                            ? "تأكيد وتسجيل الدخول"
                            : "Verify & Sign In"}
                      </button>

                      <div className="flex flex-col items-center gap-3 text-sm pt-2">
                        <button
                          type="button"
                          disabled={busy || wait > 0}
                          onClick={() => void send()}
                          className="font-semibold text-[#5C1A2B] hover:underline disabled:opacity-40"
                        >
                          {wait > 0
                            ? ar
                              ? `إعادة الإرسال بعد ${wait} ثانية`
                              : `Resend in ${wait}s`
                            : ar
                              ? "إعادة إرسال الكود"
                              : "Resend Code"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setChallenge("");
                            setCode("");
                          }}
                          className="text-muted hover:text-[#412832] hover:underline"
                        >
                          {ar ? "استخدام إيميل مختلف" : "Use a different email"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                !data.google_configured &&
                !data.firebase_configured && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 text-center">
                    {ar
                      ? "تسجيل الدخول غير متاح مؤقتاً. يمكنك استخدام رابط متابعة الطلب الذي حفظتيه."
                      : "Log in is temporarily unavailable. You can use your saved tracking link."}
                  </p>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
