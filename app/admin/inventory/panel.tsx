"use client";
import { useEffect, useState, type FormEvent } from "react";
import AdminSidebar, { type AdminView } from "../sidebar";
import { figures, dayInCairo, type Sale } from "../../lib/inventory-schema";
type Row = {
  id: string;
  name: string;
  category: string;
  image: string;
  published: boolean;
  stock: number | null;
  min_alert: number | null;
  status: string;
  stock_initialized: boolean;
  pricing_initialized: boolean;
  low_stock: boolean;
  cost_price?: number;
  selling_price?: number;
  discount?: number;
  effective_price?: number;
  profit_per_unit?: number;
  profit_margin?: number | null;
  sales_margin?: number | null;
};
type History = {
  product_id: string;
  old_pricing: { cost_price: number; selling_price: number; discount: number } | null;
  new_pricing: { cost_price: number; selling_price: number; discount: number };
  changed_at: string;
  changed_by: string;
};
type Data = { products: Row[]; version: string; sales: Sale[]; priceHistory: History[] };
type Report = {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  units_sold: number;
  profit_margin: number | null;
  products: {
    id: string;
    name: string;
    units_sold: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
};
type Margins = {
  highest_margin: { product: string; margin: number } | null;
  lowest_margin: { product: string; margin: number } | null;
  average_margin: number | null;
};
const money = (n: number | undefined | null) =>
  n == null ? "—" : new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);
const field = "mt-2 w-full rounded-xl border border-[#dfd2c8] bg-white p-3 text-[#412832]";
const button = "rounded-xl bg-[#5c1a2b] px-5 py-3 text-white disabled:opacity-50";
const card = "rounded-2xl border border-[#e8ddd5] bg-white p-5";
const statuses: Record<string, string> = {
  available: "متوفر",
  coming_soon: "قريباً",
  out_of_stock: "انتهى المخزون",
};
async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: "no-store", ...init });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error || "تعذر إكمال الطلب");
  return b;
}
export default function InventoryPanel() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("inventory"),
    [query, setQuery] = useState(""),
    [lowOnly, setLowOnly] = useState(false),
    [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Row | null>(null),
    [quantity, setQuantity] = useState(""),
    [min, setMin] = useState("5"),
    [coming, setComing] = useState(false),
    [cost, setCost] = useState(""),
    [price, setPrice] = useState(""),
    [discount, setDiscount] = useState("0"),
    [units, setUnits] = useState("1"),
    [order, setOrder] = useState(""),
    [requestId, setRequestId] = useState("");
  const [month, setMonth] = useState(() => dayInCairo(new Date().toISOString()).slice(0, 7)),
    [date, setDate] = useState(() => dayInCairo(new Date().toISOString())),
    [report, setReport] = useState<Report | null>(null),
    [daily, setDaily] = useState<Report | null>(null),
    [margins, setMargins] = useState<Margins | null>(null);
  async function load() {
    const b = await api("/api/admin/inventory");
    setData(b);
    return b as Data;
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (tab !== "reports") return;
    let active = true;
    setReport(null);
    setDaily(null);
    setMargins(null);
    Promise.all([
      api(`/api/admin/reports/monthly-profit?month=${month}&category=${category}`),
      api(`/api/admin/reports/daily-summary?date=${date}&category=${category}`),
      api(`/api/admin/reports/profit-margins?category=${category}`),
    ])
      .then(([r, d, m]) => {
        if (active) {
          setReport(r);
          setDaily(d);
          setMargins(m);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [tab, month, date, category, data]);
  function pick(p: Row) {
    setSelected(p);
    setQuantity(p.stock == null ? "" : String(p.stock));
    setMin(String(p.min_alert ?? 5));
    setComing(p.status === "coming_soon");
    setCost(p.cost_price == null ? "" : String(p.cost_price));
    setPrice(p.selling_price == null ? "" : String(p.selling_price));
    setDiscount(String(p.discount ?? 0));
    setUnits("1");
    setOrder("");
    setRequestId(crypto.randomUUID());
    setNotice("");
    setError("");
  }
  async function save(e: FormEvent, kind: "stock" | "pricing" | "sale") {
    e.preventDefault();
    if (!selected || !data || busy) return;
    if (
      kind === "sale" &&
      !window.confirm(`تسجيل بيع ${units} من ${selected.name} للطلب ${order} وخصمها من المخزون؟`)
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body =
        kind === "stock"
          ? {
              quantity: Number(quantity),
              min_stock_alert: Number(min),
              status: coming ? "coming_soon" : Number(quantity) > 0 ? "available" : "out_of_stock",
              version: data.version,
            }
          : kind === "pricing"
            ? {
                cost_price: Number(cost),
                selling_price: Number(price),
                discount: Number(discount),
                version: data.version,
              }
            : {
                product_id: selected.id,
                quantity_sold: Number(units),
                order_reference: order,
                request_id: requestId,
              };
      await api(
        kind === "sale" ? "/api/admin/sales" : `/api/admin/products/${selected.id}/${kind}`,
        {
          method: kind === "sale" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const next = await load(),
        p = next.products.find((x) => x.id === selected.id);
      if (p) pick(p);
      setNotice(
        kind === "sale"
          ? "تم تسجيل البيع وخصم الكمية. لا تعيدي تسجيل نفس الطلب."
          : "تم الحفظ بنجاح",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }
  const preview =
    cost !== "" && price !== ""
      ? figures({
          cost_price: Number(cost),
          selling_price: Number(price),
          discount: Number(discount),
        })
      : null;
  const visible =
    data?.products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!lowOnly || p.low_stock) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  function navigate(view: AdminView) {
    if (view !== "inventory")
      window.location.assign(view === "codes" ? "/admin/rewards" : `/admin?view=${view}`);
    return true;
  }
  return (
    <main
      dir="rtl"
      className="admin-panel min-h-dvh bg-[#f8f5f1] font-arabic text-[#412832] lg:pr-64"
    >
      <style>{`.admin-panel,.admin-panel *{cursor:auto}.admin-panel button,.admin-panel a{cursor:pointer}.admin-panel input{cursor:text}`}</style>
      <AdminSidebar active="inventory" onNavigate={navigate} disabled={busy} />
      <header className="border-b border-[#e8ddd5] bg-white py-5 pl-5 pr-16 lg:px-8">
        <h1 className="m-0 text-xl">المخزون والأسعار</h1>
        <p className="mb-0 mt-2 text-sm text-[#917c73]">
          بيانات خاصة بالإدارة · الأسعار لا تظهر للعملاء
        </p>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-8">
        <div className="flex flex-wrap gap-2">
          {[
            ["inventory", "المخزون"],
            ["reports", "التقارير"],
            ["sales", "سجل المبيعات"],
            ["history", "تاريخ الأسعار"],
          ].map(([id, title]) => (
            <button
              key={id}
              disabled={busy}
              onClick={() => setTab(id)}
              className={
                tab === id ? button : "rounded-xl border border-[#dfd2c8] bg-white px-5 py-3"
              }
            >
              {title}
            </button>
          ))}
          <button
            disabled={busy}
            className="rounded-xl border px-4 py-3"
            onClick={() => {
              setBusy(true);
              load()
                .then(() => setSelected(null))
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            تحديث البيانات
          </button>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">
            {notice}
          </p>
        )}
        {!data && <p>جارٍ تحميل البيانات…</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["المنتجات", data.products.length],
                ["تنبيهات المخزون", data.products.filter((p) => p.low_stock).length],
                ["كميات غير مسجلة", data.products.filter((p) => !p.stock_initialized).length],
                ["أسعار غير مسجلة", data.products.filter((p) => !p.pricing_initialized).length],
              ].map(([title, n]) => (
                <div key={title} className={card}>
                  <p className="m-0 text-sm text-[#917c73]">{title}</p>
                  <p className="mb-0 mt-3 text-2xl">{n}</p>
                </div>
              ))}
            </div>
            <label className="block max-w-xs text-sm">
              الفئة
              <select
                className={field}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">الكل</option>
                <option value="skin">العناية بالبشرة</option>
                <option value="hair">العناية بالشعر</option>
                <option value="supplements">المكملات</option>
              </select>
            </label>
            {tab === "inventory" && (
              <>
                <p className="text-sm leading-7 text-[#806b63]">
                  أدخل الكمية المؤكدة عندك أو لدى المورد. المنتج غير المهيأ يحتفظ بحالة توفره
                  الحالية. بعد تهيئة المخزون، الكمية هي التي تحدد التوفر على الموقع. تنبيهات المخزون
                  تظهر هنا داخل الإدارة.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    aria-label="ابحث عن منتج"
                    placeholder="ابحث عن منتج…"
                    className={field + " max-w-sm"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lowOnly}
                      onChange={(e) => setLowOnly(e.target.checked)}
                    />
                    المخزون المنخفض فقط
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visible.map((p) => (
                    <button
                      disabled={busy}
                      key={p.id}
                      onClick={() => pick(p)}
                      className={
                        card +
                        " text-right " +
                        (selected?.id === p.id ? "ring-2 ring-[#c9a05c]" : "")
                      }
                    >
                      <div className="flex gap-3">
                        <img src={p.image} alt="" className="size-14 rounded-lg object-contain" />
                        <div className="min-w-0">
                          <h2 className="m-0 break-words text-sm font-bold">{p.name}</h2>
                          <p className="mb-0 mt-2 text-xs">
                            {statuses[p.status]} {!p.published && "· مسودة"}
                          </p>
                        </div>
                      </div>
                      <p className="mb-0 text-sm">
                        الكمية: {p.stock ?? "غير مسجلة"}{" "}
                        {p.low_stock && <span className="text-red-700"> · مخزون منخفض</span>}
                      </p>
                      <p className="mb-0 text-sm">
                        البيع بعد الخصم: {money(p.effective_price)} ج · ربح الوحدة:{" "}
                        {money(p.profit_per_unit)} ج
                      </p>
                    </button>
                  ))}
                </div>
                {!visible.length && <p>لا توجد منتجات مطابقة.</p>}
                {selected && (
                  <section className="space-y-4" aria-label="إدارة المنتج">
                    <h2 className="break-words text-xl">{selected.name}</h2>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <form onSubmit={(e) => save(e, "stock")} className={card}>
                        <h3 className="mt-0">المخزون</h3>
                        <label className="block">
                          الكمية المؤكدة
                          <input
                            required
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            className={field}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                          />
                        </label>
                        <label className="mt-4 block">
                          تنبيه عندما تقل الكمية عن
                          <input
                            required
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            className={field}
                            value={min}
                            onChange={(e) => setMin(e.target.value)}
                          />
                        </label>
                        <label className="my-5 flex gap-2">
                          <input
                            type="checkbox"
                            checked={coming}
                            onChange={(e) => setComing(e.target.checked)}
                          />
                          قريباً (عند كمية صفر)
                        </label>
                        <button disabled={busy} className={button}>
                          حفظ المخزون
                        </button>
                      </form>
                      <form onSubmit={(e) => save(e, "pricing")} className={card}>
                        <h3 className="mt-0">الأسعار بالجنيه المصري</h3>
                        {[
                          ["سعر الشراء", cost, setCost],
                          ["سعر البيع قبل الخصم", price, setPrice],
                          ["الخصم %", discount, setDiscount],
                        ].map(([label, value, set], i) => (
                          <label key={String(label)} className="mb-3 block">
                            {String(label)}
                            <input
                              required
                              type="number"
                              min="0"
                              max={i === 2 ? 100 : 10000000}
                              step="0.01"
                              className={field}
                              value={String(value)}
                              onChange={(e) => (set as (v: string) => void)(e.target.value)}
                            />
                          </label>
                        ))}
                        {preview && (
                          <div className="mb-4 rounded-xl bg-[#f8f5f1] p-3 text-sm leading-7">
                            البيع الفعلي: {money(preview.effective_price)} ج<br />
                            ربح الوحدة: {money(preview.profit_per_unit)} ج<br />
                            نسبة الربح على التكلفة: {money(preview.profit_margin)}%<br />
                            هامش المبيعات: {money(preview.sales_margin)}%
                            {preview.profit_per_unit < 0 && (
                              <p className="text-red-700">السعر بعد الخصم أقل من تكلفة الشراء.</p>
                            )}
                          </div>
                        )}
                        <button disabled={busy} className={button}>
                          حفظ الأسعار
                        </button>
                      </form>
                      <form onSubmit={(e) => save(e, "sale")} className={card}>
                        <h3 className="mt-0">تسجيل بيع مُسلّم</h3>
                        <p className="text-sm leading-7">
                          سجّل البيع الفعلي فقط. فتح واتساب لا يسجل بيعاً. ستُخصم الكمية ويُحفظ
                          السعر الحالي بعد الخصم.
                        </p>
                        <label className="block">
                          مرجع الطلب
                          <input
                            required
                            maxLength={100}
                            className={field}
                            value={order}
                            onChange={(e) => {
                              setOrder(e.target.value);
                              setRequestId(crypto.randomUUID());
                            }}
                            placeholder="مثال: CL-1001"
                          />
                        </label>
                        <label className="mt-4 block">
                          عدد القطع
                          <input
                            required
                            type="number"
                            min="1"
                            max={selected.stock || 1}
                            step="1"
                            className={field}
                            value={units}
                            onChange={(e) => {
                              setUnits(e.target.value);
                              setRequestId(crypto.randomUUID());
                            }}
                          />
                        </label>
                        <p className="text-sm">
                          إجمالي البيع: {money((selected.effective_price || 0) * Number(units))} ج
                          <br />
                          مجمل ربح البيع: {money((selected.profit_per_unit || 0) * Number(units))} ج
                        </p>
                        <button
                          disabled={
                            busy ||
                            !selected.stock_initialized ||
                            !selected.pricing_initialized ||
                            selected.status !== "available"
                          }
                          className={button}
                        >
                          تسجيل البيع وخصم المخزون
                        </button>
                        <p className="mb-0 mt-3 text-xs">
                          مرجع الطلب يمنع تكرار تسجيل نفس المنتج لنفس الطلب.
                        </p>
                      </form>
                    </div>
                  </section>
                )}
              </>
            )}
            {tab === "reports" && (
              <>
                <p className="rounded-xl bg-amber-50 p-4 text-sm leading-7">
                  الأرقام هي مجمل ربح المنتجات بعد الخصم، وليست صافي الدخل. لا تخصم الإعلان والتغليف
                  والهدايا والشحن والضرائب. التقارير تستخدم أسعار وقت البيع وتوقيت القاهرة؛ لا توجد
                  مبيعات افتراضية.
                </p>
                <div className="flex flex-wrap gap-4">
                  <label>
                    الشهر
                    <input
                      aria-label="الشهر"
                      type="month"
                      required
                      className={field}
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  </label>
                  <label>
                    اليوم
                    <input
                      aria-label="اليوم"
                      type="date"
                      required
                      className={field}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                </div>
                {report ? (
                  <>
                    <h2>ملخص الشهر</h2>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {[
                        ["المبيعات", report.total_revenue],
                        ["تكلفة البضاعة", report.total_cost],
                        ["مجمل الربح", report.total_profit],
                        ["القطع المباعة", report.units_sold],
                      ].map(([title, n]) => (
                        <div className={card} key={title}>
                          <p className="text-sm">{title}</p>
                          <strong className="text-xl">{money(Number(n))}</strong>
                        </div>
                      ))}
                    </div>
                    <p>هامش الربح من المبيعات: {money(report.profit_margin)}%</p>
                    <h3>أفضل المنتجات مبيعاً خلال الشهر</h3>
                    <div className="space-y-3">
                      {report.products.map((p, i) => (
                        <div className={card} key={p.id}>
                          <strong>
                            {i + 1}. {p.name}
                          </strong>
                          <p className="mb-0 text-sm">
                            {p.units_sold} قطعة · مبيعات {money(p.revenue)} ج · تكلفة{" "}
                            {money(p.cost)} ج · مجمل ربح {money(p.profit)} ج
                          </p>
                        </div>
                      ))}
                      {!report.products.length && <p>لا توجد مبيعات مسجلة لهذه الفترة والفئة.</p>}
                    </div>
                  </>
                ) : (
                  <p>جارٍ تحميل التقرير…</p>
                )}
                {daily && (
                  <div className={card}>
                    <h3>ملخص اليوم المحدد</h3>
                    <p>
                      {daily.units_sold} قطعة · مبيعات {money(daily.total_revenue)} ج · مجمل ربح{" "}
                      {money(daily.total_profit)} ج
                    </p>
                  </div>
                )}
                {margins && (
                  <div className={card}>
                    <h3>هوامش الأسعار الحالية بعد الخصم</h3>
                    <p>
                      الأعلى: {margins.highest_margin?.product || "—"} (
                      {money(margins.highest_margin?.margin)}%)
                    </p>
                    <p>
                      الأقل: {margins.lowest_margin?.product || "—"} (
                      {money(margins.lowest_margin?.margin)}%)
                    </p>
                    <p>متوسط هوامش المنتجات المهيأة: {money(margins.average_margin)}%</p>
                  </div>
                )}
              </>
            )}
            {tab === "sales" && (
              <>
                <h2>آخر 200 عملية بيع</h2>
                {!data.sales.length && <p>لم تُسجل مبيعات بعد.</p>}
                <div className="space-y-3">
                  {data.sales
                    .filter((s) => category === "all" || s.category === category)
                    .map((s) => (
                      <div className={card} key={s.id}>
                        <strong>{s.name}</strong>
                        <p className="text-sm">
                          طلب {s.order_reference} ·{" "}
                          {new Date(s.date).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
                        </p>
                        <p className="mb-0 text-sm">
                          {s.quantity_sold} قطعة · مبيعات {money(s.revenue)} ج · تكلفة{" "}
                          {money(s.cost)} ج · مجمل ربح {money(s.profit)} ج
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
            {tab === "history" && (
              <>
                <h2>آخر 200 تغيير للأسعار</h2>
                {!data.priceHistory.length && <p>لم تُعدّل الأسعار بعد.</p>}
                <div className="space-y-3">
                  {data.priceHistory
                    .filter(
                      (h) =>
                        category === "all" ||
                        data.products.find((p) => p.id === h.product_id)?.category === category,
                    )
                    .map((h, i) => (
                      <div key={i} className={card}>
                        <strong>
                          {data.products.find((p) => p.id === h.product_id)?.name || h.product_id}
                        </strong>
                        <p className="text-sm">
                          {new Date(h.changed_at).toLocaleString("ar-EG", {
                            timeZone: "Africa/Cairo",
                          })}{" "}
                          · {h.changed_by}
                        </p>
                        <p className="text-sm">
                          السابق: شراء {money(h.old_pricing?.cost_price)} · بيع{" "}
                          {money(h.old_pricing?.selling_price)} · خصم{" "}
                          {money(h.old_pricing?.discount)}%
                        </p>
                        <p className="mb-0 text-sm">
                          الجديد: شراء {money(h.new_pricing.cost_price)} · بيع{" "}
                          {money(h.new_pricing.selling_price)} · خصم {money(h.new_pricing.discount)}
                          %
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
