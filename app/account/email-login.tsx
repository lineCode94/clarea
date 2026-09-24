"use client";
import { useState, type FormEvent } from "react";
export default function EmailLogin({ ar, onSuccess }: { ar: boolean; onSuccess: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [verify, setVerify] = useState(false);
  async function submit(action: "signin" | "signup" | "resend" | "reset") {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, ...(action === "reset" ? {} : { password }) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.authenticated) {
        setPassword("");
        onSuccess();
        return;
      }
      setVerify(Boolean(data.verification_sent || data.verification_required));
      setMessage(
        data.reset_sent
          ? ar
            ? "لو الإيميل مسجل هتوصلك رسالة لاستعادة كلمة المرور."
            : "If the email is registered, you will receive a password reset link."
          : ar
            ? "افتحي رسالة التحقق في بريدك (وراجعي Spam)، ثم ارجعي واضغطي تسجيل الدخول. تقدري تعيدي إرسالها بالزر أدناه."
            : "Open the verification email (check spam), then return and sign in. You can resend it below.",
      );
      setMode("signin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">
        {ar ? "حساب بالإيميل — اختياري" : "Email account — optional"}
      </h2>
      <div className="flex gap-3">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={busy}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`rounded-xl px-4 py-2 text-sm ${mode === m ? "bg-[#5C1A2B] text-white" : "bg-[#F5E9E2]"}`}
          >
            {m === "signin"
              ? ar
                ? "تسجيل الدخول"
                : "Sign in"
              : ar
                ? "إنشاء حساب"
                : "Create account"}
          </button>
        ))}
      </div>
      <form
        className="space-y-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void submit(mode);
        }}
      >
        <label className="block text-sm">
          {ar ? "الإيميل" : "Email"}
          <input
            required
            type="email"
            dir="ltr"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border p-3"
          />
        </label>
        <label className="block text-sm">
          {ar ? "كلمة المرور (8 أحرف على الأقل)" : "Password (at least 8 characters)"}
          <input
            required
            type="password"
            dir="ltr"
            minLength={8}
            maxLength={128}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border p-3"
          />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-xl bg-[#5C1A2B] p-3 font-bold text-white disabled:opacity-40"
        >
          {busy
            ? ar
              ? "لحظة…"
              : "Please wait…"
            : mode === "signup"
              ? ar
                ? "إنشاء حساب وإرسال التحقق"
                : "Create account & verify email"
              : ar
                ? "تسجيل الدخول"
                : "Sign in"}
        </button>
      </form>
      <div className="flex flex-wrap gap-3 text-sm underline">
        <button disabled={busy || !email} onClick={() => void submit("reset")}>
          {ar ? "نسيت كلمة المرور" : "Forgot password"}
        </button>
        {verify && (
          <button disabled={busy || !password} onClick={() => void submit("resend")}>
            {ar ? "إعادة إرسال التحقق" : "Resend verification"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="rounded-xl bg-[#F5E9E2] p-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
