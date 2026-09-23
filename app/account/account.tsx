"use client";
import React, { useEffect, useState, type FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { TbShoppingBag, TbUser, TbBox, TbCheck, TbTruck, TbX, TbMapPin, TbPhone, TbClock } from "react-icons/tb";
import CustomerNav from "../components/layout/customer-nav";
import { recentOrders, type RecentOrder } from "../lib/recent-orders";
import { useLanguage } from "../hooks/use-language";

type AccountData = {
  authenticated: boolean;
  configured?: boolean;
  google_configured?: boolean;
  email?: string;
  profile?: { name: string; phone: string; address: string };
  profile_version?: string;
  orders?: {
    reference: string;
    status: string;
    tracking_path: string;
    created_at: string;
    subtotal: number;
    shipping_fee: number | null;
    items: { name: string; quantity: number; price: number; subtotal: number }[];
  }[];
};

const field = "mt-2 w-full rounded-xl border border-[#dbcac0] bg-white p-3.5 text-sm outline-offset-4 focus:border-[#5C1A2B] focus:outline-[#C9A05C] placeholder:text-gray-400";
const button = "min-h-12 w-full rounded-xl bg-[#5C1A2B] px-5 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[#481422] disabled:opacity-40";

export default function Account() {
  const [lang, setLang] = useLanguage("ar");
  const ar = lang === "ar";

  const labels: Record<string, string> = {
    pending: ar ? "بانتظار التأكيد" : "Pending",
    confirmed: ar ? "تم تأكيده" : "Confirmed",
    shipped: ar ? "تم شحنه" : "Shipped",
    delivered: ar ? "تم تسليمه" : "Delivered",
    cancelled: ar ? "ملغي" : "Cancelled",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <TbClock size={16} />,
    confirmed: <TbCheck size={16} />,
    shipped: <TbTruck size={16} />,
    delivered: <TbBox size={16} />,
    cancelled: <TbX size={16} />,
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const [tab, setTab] = useState<"orders" | "profile">("orders");
  const [profile, setProfile] = useState({ name: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);
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
    if (!response.ok) throw new Error(ar ? "تعذر تحميل حسابك. حاولي مجدداً." : "Could not load account. Try again.");
    const next = await response.json();
    setData(next);
    if (next.profile) setProfile(next.profile);
    return next;
  }

  useEffect(() => {
    let initialError = "";
    const login = new URLSearchParams(window.location.search).get("login");
    if (login === "failed") initialError = ar ? "تعذر تسجيل الدخول بجوجل. حاولي مجدداً." : "Google login failed. Please try again.";
    if (login === "cancelled") initialError = ar ? "تم إلغاء تسجيل الدخول. تقدري تحاولي مرة أخرى." : "Login was cancelled. You can try again.";
    if (login === "unavailable") initialError = ar ? "تسجيل الدخول بجوجل غير متاح حالياً." : "Google login is currently unavailable.";
    
    setRecent(recentOrders());
    refresh()
      .then((accData) => {
        // Clear auth error if user is actually authenticated
        if (accData?.authenticated) {
          setError("");
          // Clean up URL to prevent error from showing on refresh
          if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (initialError) {
          setError(initialError);
        }
      })
      .catch((e) => setError(e.message));
  }, [ar]);

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
      setError(e instanceof Error ? e.message : (ar ? "تعذر الإرسال" : "Could not send"));
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
      setError(e instanceof Error ? e.message : (ar ? "تعذر التحقق" : "Verification failed"));
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
      setError(ar ? "تعذر تسجيل الخروج" : "Could not log out");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const r = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, version: data?.profile_version }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || (ar ? "فشل الحفظ" : "Failed to save"));
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر الحفظ" : "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  const activeOrders = data?.orders?.filter((o) => !["delivered", "cancelled"].includes(o.status)).length || 0;

  return (
    <main dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"} className={`min-h-dvh bg-[#fffdfa] text-[#412832] ${ar ? "font-arabic" : "font-sans"}`}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <CustomerNav lang={lang} onLangChange={setLang} />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Account Area */}
          <section className="lg:col-span-8 rounded-3xl border border-[#e9ddd5] bg-white p-6 sm:p-10 shadow-sm">
            <header className="mb-8 border-b border-[#e9ddd5] pb-6">
              <p className="mb-2 text-xs font-semibold tracking-[.2em] text-[#C9A05C] uppercase">MY CLARÉA</p>
              <h1 className="text-3xl font-bold text-[#5C1A2B]">
                {data?.authenticated 
                  ? (ar ? `أهلاً ${profile.name || "بيكي"} 🤍` : `Welcome ${profile.name || "back"} 🤍`) 
                  : (ar ? "حسابك في Claréa" : "Your Claréa Account")}
              </h1>
            </header>

            {error && (
              <div role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-900 border border-red-200">
                {error}
              </div>
            )}

            {!data && !error && (
              <div className="py-10 text-center text-muted">
                <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-[#e9ddd5] border-t-[#5C1A2B]"></div>
                <p>{ar ? "جاري تحميل حسابك…" : "Loading your account..."}</p>
              </div>
            )}

            {!data && error && (
              <div className="text-center py-10">
                <button className={button + " max-w-xs"} onClick={() => { setError(""); refresh().catch((e) => setError(e.message)); }}>
                  {ar ? "إعادة المحاولة" : "Try Again"}
                </button>
              </div>
            )}

            {data?.authenticated ? (
              <>
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F5E9E2]/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-[#5C1A2B] text-white">
                      <TbUser size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-muted">{ar ? "مسجل دخول بحساب" : "Logged in as"}</p>
                      <p dir="ltr" className="text-sm font-semibold text-[#5C1A2B] break-all">{data.email}</p>
                    </div>
                  </div>
                  <button disabled={busy} className="text-sm font-semibold text-[#5C1A2B] hover:underline" onClick={() => void logout()}>
                    {ar ? "تسجيل الخروج" : "Log out"}
                  </button>
                </div>

                <div className="mb-8 flex gap-3 border-b border-[#e9ddd5] pb-4 overflow-x-auto no-scrollbar">
                  <button
                    aria-pressed={tab === "orders"}
                    onClick={() => { setTab("orders"); setSaved(false); }}
                    className={`flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                      tab === "orders" ? "bg-[#5C1A2B] text-white" : "bg-[#F5E9E2]/50 text-[#5C1A2B] hover:bg-[#F5E9E2]"
                    }`}
                  >
                    <TbShoppingBag size={18} />
                    {ar ? "طلباتي" : "My Orders"}
                  </button>
                  <button
                    aria-pressed={tab === "profile"}
                    onClick={() => setTab("profile")}
                    className={`flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                      tab === "profile" ? "bg-[#5C1A2B] text-white" : "bg-[#F5E9E2]/50 text-[#5C1A2B] hover:bg-[#F5E9E2]"
                    }`}
                  >
                    <TbUser size={18} />
                    {ar ? "بياناتي" : "Profile Details"}
                  </button>
                </div>

                {tab === "profile" ? (
                  <form onSubmit={saveProfile} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-semibold text-[#412832] mb-1">{ar ? "الاسم" : "Name"}</label>
                      <input
                        maxLength={120}
                        autoComplete="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className={field}
                        placeholder={ar ? "الاسم بالكامل" : "Full Name"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#412832] mb-1">{ar ? "رقم الموبايل" : "Phone Number"}</label>
                      <input
                        type="tel"
                        dir="ltr"
                        maxLength={40}
                        autoComplete="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className={field}
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#412832] mb-1">{ar ? "عنوان التوصيل الافتراضي" : "Default Delivery Address"}</label>
                      <textarea
                        maxLength={500}
                        autoComplete="street-address"
                        rows={3}
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className={field}
                        placeholder={ar ? "الشارع، المنطقة، المدينة" : "Street, Area, City"}
                      />
                    </div>
                    
                    <p className="flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                      <span className="mt-0.5 text-blue-500">ℹ️</span>
                      {ar 
                        ? "تعديل بياناتك هنا لا يغيّر عنوان التوصيل للطلبات اللي تم تأكيدها بالفعل." 
                        : "Updating your details here does not affect the delivery address of already confirmed orders."}
                    </p>
                    
                    <div className="pt-2">
                      <button disabled={busy} className={button}>
                        {busy ? (ar ? "جاري الحفظ…" : "Saving...") : (ar ? "حفظ البيانات" : "Save Changes")}
                      </button>
                    </div>
                    
                    {saved && (
                      <p role="status" className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700 pt-2">
                        <TbCheck size={18} />
                        {ar ? "تم حفظ بياناتك بنجاح" : "Profile updated successfully"}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="mb-6 text-sm text-muted">
                      {ar ? "تابعي تفاصيل وحالة كل طلباتك من هنا." : "Track your order status and details here."}
                    </p>
                    
                    {data.orders?.length ? (
                      <div className="space-y-4">
                        {data.orders.map((o) => (
                          <a
                            href={o.tracking_path}
                            key={o.reference}
                            className="group block overflow-hidden rounded-2xl border border-[#e9ddd5] transition-all hover:border-[#5C1A2B] hover:shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9ddd5] bg-[#F5E9E2]/20 p-5">
                              <div>
                                <p className="text-xs text-muted mb-1">
                                  {ar ? "رقم الطلب" : "Order Reference"}
                                </p>
                                <strong dir="ltr" className="text-lg text-[#5C1A2B] tracking-wider font-bold block">
                                  {o.reference}
                                </strong>
                              </div>
                              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusColors[o.status] || "bg-gray-100 text-gray-800"}`}>
                                {statusIcons[o.status]}
                                {labels[o.status]}
                              </div>
                            </div>
                            
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-4">
                                <span className="flex items-center gap-1.5 text-xs text-muted">
                                  <TbClock size={14} />
                                  {new Date(o.created_at).toLocaleDateString(ar ? "ar-EG" : "en-EG", {
                                    timeZone: "Africa/Cairo",
                                    year: 'numeric', month: 'long', day: 'numeric'
                                  })}
                                </span>
                                <span className="text-sm font-bold text-[#5C1A2B]">
                                  {o.subtotal.toLocaleString(ar ? "ar-EG" : "en-EG")} {ar ? "ج.م" : "EGP"}
                                </span>
                              </div>
                              
                              <p className="text-sm text-[#412832] font-medium">
                                {o.items.length} {ar ? (o.items.length === 1 ? "منتج" : "منتجات") : (o.items.length === 1 ? "Item" : "Items")}
                              </p>
                              
                              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#5C1A2B] group-hover:text-[#C9A05C] transition-colors">
                                {ar ? "عرض التفاصيل والتتبع" : "View Details & Track"}
                                <span className={ar ? "rotate-180" : ""}>→</span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e9ddd5] py-16 text-center">
                        <div className="mb-4 grid size-16 place-items-center rounded-full bg-[#F5E9E2] text-[#5C1A2B]">
                          <TbShoppingBag size={32} />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-[#412832]">
                          {ar ? "لا توجد طلبات بعد" : "No orders yet"}
                        </h3>
                        <p className="text-sm text-muted max-w-sm">
                          {ar 
                            ? "مفيش طلبات مسجلة بالإيميل ده لسه. طلباتك الجاية هتظهر هنا." 
                            : "You haven't placed any orders with this email yet. Your future orders will appear here."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              data && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mx-auto max-w-md space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-[#412832] leading-relaxed">
                      {ar 
                        ? "سجّلي الدخول لمتابعة طلباتك، حفظ بياناتك، وتجربة تسوق أسهل من أي جهاز." 
                        : "Log in to track your orders, save your details, and enjoy an easier shopping experience."}
                    </p>
                  </div>

                  {data.google_configured ? (
                    <a
                      href="/api/account/google"
                      className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white p-4 text-sm font-bold text-[#3c4043] shadow-sm transition-all hover:bg-gray-50 hover:shadow"
                    >
                      <FcGoogle size={24} className="group-hover:scale-110 transition-transform" />
                      {ar ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-gray-50 p-4 text-sm font-bold text-gray-400"
                    >
                      <FcGoogle size={24} className="opacity-50" />
                      {ar ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
                    </button>
                  )}

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

                  {data.configured ? (
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
                              ? (ar ? "جاري الإرسال…" : "Sending...")
                              : wait > 0
                                ? (ar ? `انتظري ${wait} ثانية` : `Wait ${wait}s`)
                                : (ar ? "إرسال كود التحقق" : "Send Login Code")}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={verify} className="space-y-5 rounded-2xl bg-[#F5E9E2]/30 p-6 border border-[#e9ddd5]">
                          <div className="text-center">
                            <p className="text-sm font-medium mb-1">
                              {ar ? "أرسلنا كود التحقق إلى:" : "We sent a code to:"}
                            </p>
                            <p dir="ltr" className="text-sm font-bold text-[#5C1A2B]">{email}</p>
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
                            {busy ? (ar ? "جاري التحقق…" : "Verifying...") : (ar ? "تأكيد وتسجيل الدخول" : "Verify & Sign In")}
                          </button>
                          
                          <div className="flex flex-col items-center gap-3 text-sm pt-2">
                            <button
                              type="button"
                              disabled={busy || wait > 0}
                              onClick={() => void send()}
                              className="font-semibold text-[#5C1A2B] hover:underline disabled:opacity-40"
                            >
                              {wait > 0
                                ? (ar ? `إعادة الإرسال بعد ${wait} ثانية` : `Resend in ${wait}s`)
                                : (ar ? "إعادة إرسال الكود" : "Resend Code")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => { setChallenge(""); setCode(""); }}
                              className="text-muted hover:text-[#412832] hover:underline"
                            >
                              {ar ? "استخدام إيميل مختلف" : "Use a different email"}
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : (
                    !data.google_configured && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 text-center">
                        {ar 
                          ? "تسجيل الدخول غير متاح مؤقتاً. يمكنك استخدام رابط تتبع الطلب المُرسل إليك."
                          : "Log in is temporarily unavailable. You can use the tracking link sent to you."}
                      </p>
                    )
                  )}
                </div>
              )
            )}
          </section>

          {/* Sidebar Area */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Account Summary Stats (Only if logged in) */}
            {data?.authenticated && (
              <div className="rounded-3xl border border-[#e9ddd5] bg-[#F5E9E2]/20 p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-[#412832]">{ar ? "ملخص حسابك" : "Account Summary"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4 text-center border border-[#e9ddd5]">
                    <strong className="block text-3xl text-[#5C1A2B] font-black">{data.orders?.length || 0}</strong>
                    <span className="text-xs font-semibold text-muted mt-1 block">{ar ? "كل الطلبات" : "Total Orders"}</span>
                  </div>
                  <div className="rounded-2xl bg-white p-4 text-center border border-[#e9ddd5]">
                    <strong className="block text-3xl text-[#5C1A2B] font-black">{activeOrders}</strong>
                    <span className="text-xs font-semibold text-muted mt-1 block">{ar ? "قيد التنفيذ" : "Active Orders"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Local Orders */}
            {recent.length > 0 && (
              <div className="rounded-3xl border border-[#e9ddd5] bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-base font-bold text-[#5C1A2B]">{ar ? "طلباتي الأخيرة" : "Recent Orders"}</h2>
                <p className="mb-4 text-xs text-muted">
                  {ar 
                    ? "الطلبات التي تمت من هذا الجهاز متوفرة للتتبع مباشرة." 
                    : "Orders placed on this device are available for direct tracking."}
                </p>
                <ul className="list-none space-y-3 p-0">
                  {recent.map((o) => (
                    <li key={o.reference}>
                      <a
                        href={o.tracking_path}
                        className="group flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[#F5E9E2]/50 px-4 py-3 text-sm transition-colors hover:bg-[#ebd5c8]"
                      >
                        <bdi className="font-bold text-[#412832]">{o.reference}</bdi>
                        <span className="text-[#5C1A2B] font-bold group-hover:translate-x-1 transition-transform">
                          {ar ? "تتبع" : "Track"} {ar ? "←" : "→"}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Help / Contact Box */}
            <div className="rounded-3xl border border-[#e9ddd5] bg-[#5C1A2B] p-6 text-white shadow-sm">
              <h3 className="mb-2 text-base font-bold">{ar ? "محتاجة مساعدة؟" : "Need help?"}</h3>
              <p className="text-sm opacity-90 mb-5 leading-relaxed">
                {ar 
                  ? "فريق خدمة العملاء جاهز يرد على استفساراتك ويساعدك في طلباتك."
                  : "Our customer service team is ready to answer your inquiries and assist with your orders."}
              </p>
              <a 
                href={ar ? "https://wa.me/201018318721?text=مرحباً+كلاريا،+لدي+استفسار+عن+طلبي" : "https://wa.me/201018318721?text=Hello+Clarea,+I+have+an+inquiry+about+my+order"}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-[#5C1A2B] px-4 py-3 text-sm font-bold transition-all hover:bg-gray-100"
              >
                {ar ? "تواصلي معنا عبر واتساب" : "Contact us on WhatsApp"}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
