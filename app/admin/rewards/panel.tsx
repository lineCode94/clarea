"use client";
import { useState, type FormEvent } from "react";
import { TbSearch, TbCheck, TbLogout } from "react-icons/tb";
import AdminSidebar, { adminExtraPaths, type AdminView } from "../sidebar";
import { rewardsConfig } from "../../config/rewards";
type Result = {
  status: "valid" | "used" | "invalid" | "legacy" | "inactive";
  award?: {
    reference: string;
    phone: string;
    prizeId: string;
    issuedAt: string;
    usedAt: string | null;
    orderReference: string | null;
  };
};
const labels = {
  valid: "كود مسجل وصالح للاستخدام",
  used: "الكود اتستخدم بالفعل",
  invalid: "الكود غير موجود أو غير صحيح",
  legacy: "كود قديم يحتاج مراجعة يدوية",
  inactive: "الكود يخص عرضًا غير نشط",
};
const field =
  "mt-2 w-full rounded-xl border border-[#e3d7d1] bg-white px-4 py-3 text-base outline-none focus:border-[#9f7952]";
export default function RewardVerification() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(data: object) {
    const response = await fetch("/api/admin/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.assign("/admin");
      throw new Error("سجّل الدخول مجددًا");
    }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "تعذر إكمال العملية");
    return body as Result;
  }
  async function check(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setPhone("");
    setOrder("");
    try {
      setResult(await request({ action: "check", code }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function redeem(event: FormEvent) {
    event.preventDefault();
    if (
      !result?.award ||
      !window.confirm("تأكيد صرف الهدية لهذا الطلب؟ سيُمنع استخدام الكود مرة أخرى.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await request({
          action: "redeem",
          code: result.award.reference,
          phone,
          orderReference: order,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(view: AdminView) {
    if (view in adminExtraPaths) {
      window.location.assign(adminExtraPaths[view as keyof typeof adminExtraPaths]);
      return true;
    }
    if (view === "orders") {
      window.location.assign("/admin/orders");
      return true;
    }
    if (view === "inventory") {
      window.location.assign("/admin/inventory");
      return true;
    }
    if (view !== "codes") window.location.assign(`/admin?view=${view}`);
    return true;
  }
  const prize = rewardsConfig.prizes.find((p) => p.id === result?.award?.prizeId);
  return (
    <main
      dir="rtl"
      className="admin-panel min-h-dvh bg-[#f8f5f1] font-arabic text-[#412832] lg:pr-64"
    >
      <AdminSidebar active="codes" onNavigate={navigate} disabled={busy} />
      <header className="flex items-center justify-between gap-3 border-b border-[#e8ddd5] bg-white py-5 pl-5 pr-16 lg:px-8">
        <h1 className="m-0 text-lg">فحص أكواد الهدايا والخصومات</h1>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const r = await fetch("/api/admin/session", { method: "DELETE" });
            if (r.ok) window.location.assign("/admin");
            else setError("تعذر تسجيل الخروج");
          }}
          className="flex min-h-11 items-center gap-2 text-sm"
        >
          <TbLogout />
          خروج
        </button>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <p className="mt-0 text-sm leading-7 text-[#917c73]">
          افحصي الكود قبل تأكيد الهدية، وطابقي رقم الهاتف مع رقم العميل في الطلب. الفحص وحده لا
          يستهلك الكود.
        </p>
        <form onSubmit={check} className="rounded-2xl border border-[#e8ddd5] bg-white p-5">
          <label className="block text-sm">
            كود الهدية أو الخصم
            <input
              dir="ltr"
              required
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setResult(null);
                setError("");
              }}
              placeholder="CL2-..."
              className={field}
              disabled={busy}
            />
          </label>
          <button
            disabled={busy || !code.trim()}
            className="mt-4 flex min-h-12 items-center gap-2 rounded-xl bg-[#5C1A2B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <TbSearch />
            {busy ? "جارٍ التحقق…" : "فحص الكود"}
          </button>
        </form>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {result && (
          <section className="mt-5 rounded-2xl border border-[#e8ddd5] bg-white p-5">
            <h2
              role="status"
              className={`mt-0 rounded-xl p-4 text-base ${result.status === "valid" ? "bg-green-50 text-green-800" : result.status === "legacy" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}
            >
              {labels[result.status]}
            </h2>
            {result.status === "legacy" && (
              <p className="text-sm leading-7">
                الأكواد القديمة لم تُسجّل على السيرفر، لذلك لا يمكن إثبات صحتها تلقائيًا. هذه الحالة
                لا تعني أن العميل متلاعب. راجعي الطلب يدويًا.
              </p>
            )}
            {result.award && (
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-[#917c73]">الهدية المسجلة</dt>
                  <dd className="m-0 mt-1 font-bold">{prize?.label.ar}</dd>
                </div>
                <div>
                  <dt className="text-[#917c73]">رقم الهاتف المسجل</dt>
                  <dd dir="ltr" className="m-0 mt-1 text-right">
                    {result.award.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#917c73]">تاريخ الإصدار</dt>
                  <dd className="m-0 mt-1">
                    {new Date(result.award.issuedAt).toLocaleString("ar-EG")}
                  </dd>
                </div>
                {result.award.usedAt && (
                  <>
                    <div>
                      <dt>تاريخ الاستخدام</dt>
                      <dd className="m-0 mt-1">
                        {new Date(result.award.usedAt).toLocaleString("ar-EG")}
                      </dd>
                    </div>
                    <div>
                      <dt>مرجع الطلب</dt>
                      <dd className="m-0 mt-1">{result.award.orderReference}</dd>
                    </div>
                  </>
                )}
              </dl>
            )}
            {result.status === "valid" && (
              <form onSubmit={redeem} className="mt-6 border-t border-[#e8ddd5] pt-5">
                <label className="block text-sm">
                  رقم العميل في الطلب
                  <input
                    dir="ltr"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={field}
                    disabled={busy}
                  />
                </label>
                <label className="mt-4 block text-sm">
                  رقم أو مرجع الطلب
                  <input
                    required
                    maxLength={120}
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className={field}
                    disabled={busy}
                  />
                </label>
                <p className="text-xs leading-6 text-[#917c73]">
                  رقم الهاتف مدخل من العميل ولم يُتحقق من ملكيته برسالة SMS. طابقيه مع رقم التواصل
                  والطلب قبل الصرف.
                </p>
                <button
                  disabled={busy}
                  className="mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-[#5C1A2B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <TbCheck />
                  تأكيد الاستخدام لهذا الطلب
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
