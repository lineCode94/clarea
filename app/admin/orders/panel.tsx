"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import AdminToolbar from "../toolbar";
import AdminSidebar, { adminExtraPaths, type AdminView } from "../sidebar";
import OrderToasts, { confirmOrder, toast } from "./toasts";
import type { Order } from "../../lib/order-schema";
import { matchesAdminProduct } from "../../lib/admin-search";
import { figures, round } from "../../lib/inventory-schema";
type Product = {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  stock: number | null;
  status: string;
  stock_initialized: boolean;
  pricing_initialized: boolean;
  effective_price?: number;
  selling_price?: number;
  cost_price?: number;
};
type Line = { product_id: string; quantity: string; search?: string };
const field = "mt-2 min-w-0 w-full rounded-xl border border-[#dfd2c8] bg-white p-3 text-[#412832]";
const button = "rounded-xl bg-[#5c1a2b] px-5 py-3 text-white disabled:opacity-50";
const card = "rounded-2xl border border-[#e8ddd5] bg-white p-5";
const fmt = (v: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(v);
const labels = { pending: "قيد التجهيز", delivered: "تم تسليمه", cancelled: "ملغي" };
async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: "no-store", ...init });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "تعذر إكمال الطلب");
  return data;
}
export default function OrdersPanel({ mode = "list" }: { mode?: "list" | "new" }) {
  const [products, setProducts] = useState<Product[]>([]),
    [version, setVersion] = useState(""),
    [orders, setOrders] = useState<Order[]>([]),
    [total, setTotal] = useState(0),
    [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState("0");
  const discountPercent = discountEnabled ? Number(orderDiscount) || 0 : 0;
  const priceFor = (p: Product) =>
    figures({
      selling_price: p.selling_price ?? p.effective_price ?? 0,
      cost_price: p.cost_price || 0,
      discount: discountPercent,
    }).effective_price;
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [address, setAddress] = useState(""),
    [notes, setNotes] = useState(""),
    [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "1" }]),
    [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [created, setCreated] = useState<Order | null>(null);
  async function loadProducts() {
    const data = await api("/api/admin/inventory");
    setProducts(data.products);
    setVersion(data.version);
  }
  async function loadOrders() {
    if (mode === "new") return;
    const data = await api(
      `/api/admin/orders?offset=${offset}&status=${filter}&q=${encodeURIComponent(query)}`,
    );
    setOrders(data.orders);
    setTotal(data.total);
  }
  useEffect(() => {
    setRequestId(crypto.randomUUID());
    const id = new URLSearchParams(window.location.search).get("product");
    if (id) setLines([{ product_id: id, quantity: "1" }]);
    loadProducts().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (mode === "new") {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api(`/api/admin/orders?offset=${offset}&status=${filter}&q=${encodeURIComponent(query)}`)
      .then((d) => {
        if (active) {
          setOrders(d.orders);
          setTotal(d.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [offset, filter, query, mode]);
  function changed() {
    setRequestId(crypto.randomUUID());
  }
  function changeLine(index: number, patch: Partial<Line>) {
    changed();
    setLines((old) => old.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }
  const amounts = lines.map((line) => {
    const p = products.find((p) => p.id === line.product_id),
      n = Number(line.quantity) || 0;
    return { revenue: round((p ? priceFor(p) : 0) * n), cost: round((p?.cost_price || 0) * n) };
  });
  const revenue = round(amounts.reduce((s, l) => s + l.revenue, 0)),
    cost = round(amounts.reduce((s, l) => s + l.cost, 0));
  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy || !version) return;
    if (lines.some((line) => !line.product_id)) {
      setError("اختر منتجاً لكل سطر من نتائج البحث أولاً.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          version,
          customer: { name, phone, address },
          notes,
          discount_percent: discountPercent,
          items: lines.map((line) => ({
            product_id: line.product_id,
            quantity: Number(line.quantity),
          })),
        }),
      });
      setCreated(result.order);
      setNotice(`تم إنشاء الطلب ${result.order.reference}`);
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
      setDiscountEnabled(false);
      setOrderDiscount("0");
      setLines([{ product_id: "", quantity: "1" }]);
      setRequestId(crypto.randomUUID());
      await Promise.all([loadOrders(), loadProducts()]).catch(() =>
        setError("تم حفظ الطلب، لكن تحديث القائمة تعذر. استخدم تحديث البيانات."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء الطلب");
    } finally {
      setBusy(false);
    }
  }
  const statusPending = useRef(false);
  async function status(order: Order, status: "delivered" | "cancelled") {
    if (busy || statusPending.current) return;
    statusPending.current = true;
    setBusy(true);
    if (
      !(await confirmOrder(
        status === "delivered"
          ? `تأكيد «تم تسليمه» للطلب ${order.reference}؟ سيتم خصم جميع منتجاته وتسجيل المبيعات مرة واحدة.`
          : `إلغاء الطلب ${order.reference}؟`,
      ))
    ) {
      statusPending.current = false;
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setOrders((old) => old.map((o) => (o.id === order.id ? result.order : o)));
      setCreated((old) => (old?.id === order.id ? result.order : old));
      toast.success(`${order.reference} — ${labels[status]}`);
      await Promise.all([loadOrders(), loadProducts()]).catch(() =>
        setError("تم تغيير الحالة. تعذر تحديث البيانات؛ حدّث القائمة."),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تغيير الحالة");
    } finally {
      statusPending.current = false;
      setBusy(false);
    }
  }
  function navigate(view: AdminView) {
    if (view in adminExtraPaths) {
      window.location.assign(adminExtraPaths[view as keyof typeof adminExtraPaths]);
      return true;
    }
    if (view === "orders" && mode === "new") {
      window.location.assign("/admin/orders");
      return true;
    }
    if (view !== "orders")
      window.location.assign(
        view === "inventory"
          ? "/admin/inventory"
          : view === "codes"
            ? "/admin/rewards"
            : `/admin?view=${view}`,
      );
    return true;
  }
  return (
    <main
      dir="rtl"
      className="admin-panel min-h-dvh bg-[#f8f5f1] font-arabic text-[#412832] lg:pr-64"
    >
      <style>{`.admin-panel,.admin-panel *{cursor:auto}.admin-panel button,.admin-panel a{cursor:pointer}`}</style>
      <OrderToasts />
      <AdminSidebar
        active={mode === "new" ? "new-order" : "orders"}
        onNavigate={navigate}
        disabled={busy}
      />
      <header className="border-b border-[#e8ddd5] bg-white py-5 pl-5 pr-16 lg:px-8">
        <h1 className="m-0 text-xl">{mode === "new" ? "إدخال طلب جديد" : "سجل الطلبات"}</h1>
        <p className="mb-0 mt-2 text-sm text-[#917c73]">
          رقم تلقائي لكل طلب · منتجات متعددة · حساب موحد
        </p>
      </header>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="break-words rounded-xl bg-green-50 p-4 text-green-800">
            {notice}
          </p>
        )}
        <AdminToolbar
          active={mode}
          busy={busy}
          items={[
            { id: "new", label: "طلب جديد", href: "/admin/orders/new" },
            { id: "list", label: "سجل الطلبات", href: "/admin/orders" },
          ]}
          onRefresh={() => {
            setBusy(true);
            setError("");
            Promise.all([loadOrders(), loadProducts()])
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
        {created && (
          <section className={card}>
            <p className="mt-0 text-sm">آخر طلب أنشأته</p>
            <strong dir="ltr" className="break-all text-xl">
              {created.reference}
            </strong>
            <p className="mb-0">
              {labels[created.status]} · إجمالي المنتجات {fmt(created.revenue)} ج
            </p>
          </section>
        )}
        {mode === "new" && (
          <form onSubmit={create} className={card}>
            <fieldset disabled={busy || !version} className="min-w-0 border-0 p-0">
              <legend className="mb-4 text-xl font-bold">إنشاء طلب جديد</legend>
              <p className="mt-0 text-sm leading-7">
                رقم الطلب يظهر تلقائياً بعد الحفظ. الطلب قيد التجهيز لا يحجز أو يخصم المخزون؛ الخصم
                وتسجيل الأرباح عند «تم تسليمه». الأسعار تُثبت وقت إنشاء الطلب.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  اسم العميل
                  <input
                    required
                    maxLength={120}
                    className={field}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      changed();
                    }}
                  />
                </label>
                <label>
                  رقم الهاتف (اختياري)
                  <input
                    type="tel"
                    maxLength={40}
                    className={field}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      changed();
                    }}
                  />
                </label>
                <label>
                  العنوان (اختياري)
                  <input
                    maxLength={500}
                    className={field}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      changed();
                    }}
                  />
                </label>
                <label>
                  ملاحظات (اختياري)
                  <input
                    maxLength={1000}
                    className={field}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      changed();
                    }}
                  />
                </label>
              </div>
              <section className="my-5 rounded-xl border border-[#e8ddd5] p-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={discountEnabled}
                    onChange={(e) => {
                      setDiscountEnabled(e.target.checked);
                      changed();
                    }}
                  />
                  تطبيق خصم على هذا الطلب
                </label>
                {discountEnabled && (
                  <label className="mt-3 block">
                    نسبة خصم الطلب %
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={field}
                      value={orderDiscount}
                      onChange={(e) => {
                        setOrderDiscount(e.target.value);
                        changed();
                      }}
                    />
                  </label>
                )}
                <p className="mb-0 text-sm leading-7">
                  {discountEnabled
                    ? "يُطبق الخصم على سعر البيع الأساسي لكل المنتجات في هذا الطلب فقط، ولا يُضاف إلى خصم المنتج."
                    : "بدون خصم: يستخدم الطلب سعر البيع الأساسي حتى لو للمنتج خصم محفوظ."}
                </p>
              </section>
              <h2 className="mt-6 text-lg">منتجات الطلب</h2>
              <div className="space-y-3">
                {lines.map((line, i) => {
                  const p = products.find((p) => p.id === line.product_id);
                  const matches = products.filter((product) =>
                    matchesAdminProduct(product, line.search || ""),
                  );

                  return (
                    <div key={i} className="rounded-xl border border-[#e8ddd5] p-4">
                      <label className="mb-4 block">
                        ابحث عن المنتج أو الماركة
                        <input
                          type="search"
                          autoComplete="off"
                          aria-label={"بحث المنتج " + (i + 1)}
                          placeholder="مثلاً Arencia أو toner…"
                          className={field}
                          value={line.search || ""}
                          onChange={(e) =>
                            setLines((old) =>
                              old.map((item, index) =>
                                index === i ? { ...item, search: e.target.value } : item,
                              ),
                            )
                          }
                        />
                        <span role="status" className="mt-2 block text-xs text-[#806b63]">
                          {matches.length
                            ? matches.length + " منتج مطابق — اضغط على المنتج لاختياره"
                            : "لا توجد نتائج مطابقة. جرّب اسم المنتج أو الماركة."}
                          {line.product_id &&
                          line.search &&
                          !matches.some((product) => product.id === line.product_id)
                            ? " المنتج المختار محفوظ حتى تغيّره."
                            : ""}
                        </span>
                      </label>
                      {(!p || !!line.search?.trim()) && (
                        <div
                          aria-label={"نتائج المنتجات " + (i + 1)}
                          className="mb-4 max-h-72 overflow-y-auto rounded-xl border"
                        >
                          {matches.map((product) => {
                            const duplicate = lines.some(
                              (l, j) => j !== i && l.product_id === product.id,
                            );
                            const unavailable =
                              !product.pricing_initialized ||
                              !product.stock_initialized ||
                              product.status !== "available";
                            return (
                              <button
                                type="button"
                                key={product.id}
                                disabled={duplicate || unavailable}
                                onClick={() =>
                                  changeLine(i, { product_id: product.id, search: "" })
                                }
                                className="flex w-full items-center gap-3 border-b p-3 text-right hover:bg-[#f8f5f1] disabled:opacity-50"
                              >
                                {product.image && (
                                  <img
                                    src={product.image}
                                    alt=""
                                    className="size-12 rounded-lg object-contain"
                                  />
                                )}
                                <span>
                                  <strong className="block">{product.name}</strong>
                                  <span className="text-xs">
                                    {product.brand} ·{" "}
                                    {duplicate
                                      ? "مضاف بالفعل"
                                      : unavailable
                                        ? "غير متاح — راجع المخزون والأسعار"
                                        : fmt(priceFor(product)) + " ج"}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                        <div className="min-w-0">
                          <p className="m-0 text-sm">المنتج المختار {i + 1}</p>
                          <div className="mt-2 rounded-xl bg-[#f8f5f1] p-3 font-bold">
                            {p?.name || "ابحث واختر منتجاً من النتائج"}
                          </div>
                        </div>
                        <label>
                          الكمية {i + 1}
                          <input
                            required
                            type="number"
                            min="1"
                            max={p?.stock || 1000000}
                            step="1"
                            className={field}
                            value={line.quantity}
                            onChange={(e) => changeLine(i, { quantity: e.target.value })}
                          />
                        </label>
                        <button
                          type="button"
                          className="self-end rounded-xl border px-4 py-3 disabled:opacity-40"
                          disabled={lines.length === 1}
                          aria-label={`حذف المنتج ${i + 1}`}
                          onClick={() => {
                            changed();
                            setLines((old) => old.filter((_, j) => j !== i));
                          }}
                        >
                          حذف
                        </button>
                      </div>
                      {p && (
                        <p className="mb-0 text-sm leading-7">
                          سعر الوحدة بعد الخصم {fmt(priceFor(p))} ج · المتوفر{" "}
                          {p.stock ?? "غير مسجل"} · إجمالي السطر {fmt(amounts[i].revenue)} ج
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="my-4 rounded-xl border bg-[#f8f5f1] px-4 py-3"
                disabled={lines.length >= 50}
                onClick={() => {
                  changed();
                  setLines((old) => [...old, { product_id: "", quantity: "1" }]);
                }}
              >
                إضافة منتج آخر
              </button>
              <div className="mb-5 grid gap-3 rounded-xl bg-[#f8f5f1] p-4 sm:grid-cols-3">
                <p>
                  إجمالي المنتجات بعد الخصم
                  <br />
                  <strong>{fmt(revenue)} ج</strong>
                </p>
                <p>
                  تكلفة البضاعة
                  <br />
                  <strong>{fmt(cost)} ج</strong>
                </p>
                <p>
                  مجمل الربح المتوقع
                  <br />
                  <strong>{fmt(round(revenue - cost))} ج</strong>
                </p>
              </div>
              <p className="text-xs leading-6">
                الإجمالي للمنتجات فقط، بدون الشحن. مجمل الربح لا يخصم التغليف والإعلان وباقي
                المصاريف.
              </p>
              <button disabled={!version || busy} className={button}>
                إنشاء الطلب وإصدار رقمه
              </button>
            </fieldset>
          </form>
        )}
        {mode === "list" && (
          <section className="space-y-4">
            <h2 className="text-xl">الطلبات المسجلة</h2>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search);
                setOffset(0);
              }}
            >
              <label className="min-w-0 flex-1">
                ابحث برقم الطلب أو اسم العميل
                <input
                  className={field}
                  maxLength={120}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button className={button}>بحث</button>
              <label>
                الحالة
                <select
                  className={field}
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="all">الكل</option>
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            {loading ? (
              <p>جارٍ تحميل الطلبات…</p>
            ) : orders.length === 0 ? (
              <p>لا توجد طلبات مطابقة.</p>
            ) : (
              orders.map((order) => (
                <article className={card} key={order.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 dir="ltr" className="m-0 break-all text-lg">
                      {order.reference}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-2 text-sm ${order.status === "delivered" ? "bg-green-50 text-green-800" : order.status === "cancelled" ? "bg-gray-100" : "bg-amber-50 text-amber-900"}`}
                    >
                      {labels[order.status]}
                    </span>
                  </div>
                  <p className="break-words">
                    {order.customer.name} {order.customer.phone && `· ${order.customer.phone}`}
                  </p>
                  {order.customer.address && (
                    <p className="break-words text-sm">{order.customer.address}</p>
                  )}
                  {order.notes && <p className="break-words text-sm">{order.notes}</p>}
                  <p className="text-xs text-[#917c73]">
                    {order.discount_percent !== undefined && (
                      <span>خصم الطلب: {fmt(order.discount_percent)}% · </span>
                    )}
                    إنشاء:{" "}
                    {new Date(order.created_at).toLocaleString("ar-EG", {
                      timeZone: "Africa/Cairo",
                    })}
                    {order.delivered_at &&
                      ` · تسليم: ${new Date(order.delivered_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`}
                  </p>
                  <ul className="space-y-3 p-0">
                    {order.items.map((item) => (
                      <li
                        key={item.product_id}
                        className="list-none rounded-xl bg-[#f8f5f1] p-3 text-sm"
                      >
                        <strong className="break-words">{item.name}</strong>
                        <p className="mb-0">
                          {item.quantity} × {fmt(item.selling_price)} ج = {fmt(item.revenue)} ج ·
                          ربح {fmt(item.profit)} ج
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    إجمالي المنتجات: <strong>{fmt(order.revenue)} ج</strong> · مجمل الربح{" "}
                    {order.status === "pending" ? "المتوقع" : ""}:{" "}
                    <strong>{fmt(order.profit)} ج</strong>
                  </p>
                  {order.status === "pending" && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        className={button}
                        onClick={() => status(order, "delivered")}
                      >
                        تم تسليمه
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-xl border px-5 py-3"
                        onClick={() => status(order, "cancelled")}
                      >
                        إلغاء الطلب
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={loading || offset === 0}
                className="rounded-xl border p-3 disabled:opacity-40"
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                السابق
              </button>
              <span className="text-sm">{total} طلب</span>
              <button
                disabled={loading || offset + 50 >= total}
                className="rounded-xl border p-3 disabled:opacity-40"
                onClick={() => setOffset(offset + 50)}
              >
                التالي
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
