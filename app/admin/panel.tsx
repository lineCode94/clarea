"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  TbPlus,
  TbLogout,
  TbPhotoPlus,
  TbX,
  TbArrowUpRight,
  TbCheck,
  TbSearch,
  TbRefresh,
  TbLock,
} from "react-icons/tb";
import { matchesAdminProduct } from "../lib/admin-search";
import AdminSidebar, { type AdminView } from "./sidebar";
import type { ManagedProduct } from "../lib/catalog-schema";

type Catalog = { products: ManagedProduct[]; version: string };
const field =
  "mt-2 w-full rounded-xl border border-[#e3d7d1] bg-white px-3 py-3 text-sm outline-none focus:border-[#9f7952] focus:ring-2 focus:ring-[#c9a05c]/15 disabled:opacity-60";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#5C1A2B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50";
const categories = {
  skin: "العناية بالبشرة",
  hair: "العناية بالشعر",
  supplements: "مكملات غذائية",
  oral: "العناية بالفم",
  drinks: "المشروبات والماتشا",
};

export default function AdminPanel({ authenticated }: { authenticated: boolean }) {
  const [auth, setAuth] = useState(authenticated);
  const [password, setPassword] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<ManagedProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const navigationApplied = useRef(false);
  useEffect(() => {
    if (!auth || !catalog || navigationApplied.current) return;
    navigationApplied.current = true;
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "new") edit();
    else if (view === "published" || view === "draft") setFilter(view);
  }, [auth, catalog]);

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { ...init, cache: "no-store" });
    const body = await response.json().catch(() => ({ error: "تعذر الاتصال بالخادم" }));
    if (!response.ok) {
      if (response.status === 401) setAuth(false);
      throw new Error(body.error || "تعذر إكمال العملية");
    }
    return body;
  }
  async function load() {
    setLoading(true);
    setError("");
    setDraft(null);
    setDirty(false);
    try {
      setCatalog(await api("/api/admin/products"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (auth) void load();
  }, [auth]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setAuth(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function canLeave() {
    return !dirty || window.confirm("فيه تعديلات لم تُحفظ. هل تريد تجاهلها؟");
  }
  function edit(product?: ManagedProduct, confirmed = false) {
    if ((!confirmed && !canLeave()) || uploading || busy) return;
    setCreating(!product);
    setDirty(false);
    setError("");
    setNotice("");
    setAdvanced(false);
    setDraft(
      product
        ? structuredClone(product)
        : {
            id: crypto.randomUUID(),
            name: "",
            brand: "",
            category: "skin",
            available: true,
            published: false,
            newArrival: true,
            images: [],
            tone: "#f5efea",
            label: { ar: "", en: "" },
            description: { ar: "", en: "" },
          },
    );
    window.setTimeout(
      () =>
        document
          .getElementById("product-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }
  function change(patch: Partial<ManagedProduct>) {
    setDraft((previous) => (previous ? { ...previous, ...patch } : previous));
    setDirty(true);
    setNotice("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !catalog || uploading) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next: Catalog = await api("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: draft, create: creating, version: catalog.version }),
      });
      setCatalog(next);
      setCreating(false);
      setDirty(false);
      setNotice(
        draft.published
          ? "اتحفظ المنتج وظهر على الموقع. افتح الموقع أو حدّث صفحته لمشاهدة التعديل."
          : "اتحفظ المنتج كمسودة مخفية عن الزوار.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files || !draft) return;
    if (files.length + draft.images.length > 6) {
      setError("الحد الأقصى 6 صور لكل منتج");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (file.size > 3 * 1024 * 1024) throw new Error("كل صورة يجب أن تكون أقل من 3 ميجابايت");
        const form = new FormData();
        form.append("file", file);
        const data = await api("/api/admin/images", { method: "POST", body: form });
        setDraft((previous) =>
          previous ? { ...previous, images: [...previous.images, data.url] } : previous,
        );
        setDirty(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function detail(
    key: "size" | "skinType" | "ingredients" | "usage" | "caution" | "contents",
    lang: "ar" | "en",
    value: string,
  ) {
    if (!draft) return;
    const details = draft.details || {
      size: "",
      skinType: { ar: "", en: "" },
      ingredients: { ar: [], en: [] },
      usage: { ar: [], en: [] },
      caution: { ar: "", en: "" },
    };
    if (key === "size") change({ details: { ...details, size: value } });
    else if (key === "ingredients" || key === "usage" || key === "contents")
      change({
        details: {
          ...details,
          [key]: { ...(details[key] || { ar: [], en: [] }), [lang]: value.split("\n") },
        },
      });
    else change({ details: { ...details, [key]: { ...details[key], [lang]: value } } });
  }

  const visible =
    catalog?.products.filter(
      (p) =>
        matchesAdminProduct(p, query) &&
        (filter === "all" || (filter === "published" ? p.published : !p.published)),
    ) || [];

  function navigate(view: AdminView) {
    if (busy || uploading || loading || !canLeave()) return false;
    setError("");
    setNotice("");
    setQuery("");
    if (view === "orders") {
      window.location.assign("/admin/orders");
      return true;
    }
    if (view === "inventory") {
      window.location.assign("/admin/inventory");
      return true;
    }
    if (view === "codes") {
      window.location.assign("/admin/rewards");
      return true;
    }
    if (view === "new") edit(undefined, true);
    else {
      setDraft(null);
      setDirty(false);
      setFilter(view);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    return true;
  }

  return (
    <main
      dir="rtl"
      className={`admin-panel min-h-dvh bg-[#f8f5f1] font-arabic text-[#412832] ${auth ? "lg:pr-64" : ""}`}
    >
      {auth && (
        <AdminSidebar
          active={draft && creating ? "new" : (filter as AdminView)}
          onNavigate={navigate}
          disabled={busy || uploading || loading || !catalog}
        />
      )}
      <style>{`.admin-panel,.admin-panel *{cursor:auto}.admin-panel button,.admin-panel a,.admin-panel label[for=product-images]{cursor:pointer}.admin-panel input,.admin-panel textarea{cursor:text}`}</style>
      <header
        className={`border-b border-[#e8ddd5] bg-white px-4 py-5 sm:px-8 ${auth ? "!pr-16 lg:!pr-8" : ""}`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/pwa/icon-192-logo-v3.png" alt="Claréa" className="size-12 rounded-xl" />
            <div>
              <h1 className="m-0 text-xl font-bold">إدارة المنتجات</h1>
              <p className="m-0 mt-1 text-xs text-[#917c73]">CLARÉA · YOUR COLLECTION</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-sm"
            >
              فتح الموقع <TbArrowUpRight />
            </a>
            {auth && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 text-sm"
                disabled={busy || uploading}
                onClick={async () => {
                  if (!canLeave()) return;
                  try {
                    await api("/api/admin/session", { method: "DELETE" });
                    setAuth(false);
                    setCatalog(null);
                    setDraft(null);
                    setDirty(false);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <TbLogout /> خروج
              </button>
            )}
          </div>
        </div>
      </header>
      {!auth ? (
        <div className="mx-auto max-w-md px-5 py-20">
          <form
            onSubmit={login}
            className="rounded-3xl border border-[#e8ddd5] bg-white p-7 shadow-sm"
          >
            <TbLock className="mb-5 text-[#b58b4b]" size={30} />
            <h2 className="m-0 text-2xl">أهلًا بك في Claréa</h2>
            <p className="mt-3 text-sm leading-7 text-[#917c73]">
              سجّل الدخول لإضافة المنتجات وتحديث الصور والتوفر.
            </p>
            <label className="block text-sm">
              كلمة المرور
              <input
                required
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button disabled={busy} className={`${button} mt-6 w-full`}>
              {busy ? "جارٍ تسجيل الدخول…" : "دخول لوحة الإدارة"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs tracking-widest text-[#a88758]">THE COLLECTION</p>
              <h2 className="m-0 mt-2 text-3xl">منتجاتك، في مكان واحد</h2>
              <p className="mb-0 text-sm text-[#917c73]">
                {catalog?.products.length ?? "—"} منتج ·{" "}
                {catalog?.products.filter((p) => p.published).length ?? "—"} ظاهر على الموقع
              </p>
            </div>
            <button
              className={button}
              disabled={!catalog || busy || uploading}
              onClick={() => edit()}
            >
              <TbPlus size={20} /> إضافة منتج
            </button>
          </div>
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <TbCheck />
              {notice}
            </div>
          )}
          <div
            className={`grid items-start gap-6 ${draft ? "lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]" : ""}`}
          >
            <section
              className={`${draft ? "hidden lg:block" : ""} min-w-0 rounded-2xl border border-[#e8ddd5] bg-white p-4 sm:p-5`}
            >
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[160px] flex-1">
                  <TbSearch className="absolute right-3 top-3.5 text-[#917c73]" />
                  <input
                    aria-label="البحث في المنتجات"
                    placeholder="ابحث عن منتج أو ماركة"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${field} !mt-0 !pr-9`}
                  />
                </div>
                <select
                  aria-label="حالة النشر"
                  className="min-h-11 rounded-xl border border-[#e3d7d1] bg-white px-2 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">الكل</option>
                  <option value="published">منشور</option>
                  <option value="draft">مسودات</option>
                </select>
                <button
                  title="تحديث القائمة"
                  aria-label="تحديث القائمة"
                  disabled={loading || busy || uploading}
                  onClick={() => {
                    if (canLeave()) void load();
                  }}
                  className="grid size-11 place-items-center rounded-xl border border-[#e3d7d1]"
                >
                  <TbRefresh />
                </button>
              </div>
              {loading && (
                <p role="status" className="text-sm text-[#917c73]">
                  جارٍ تحميل المنتجات…
                </p>
              )}
              {!loading && !visible.length && (
                <p className="py-8 text-center text-sm text-[#917c73]">
                  لا توجد منتجات بهذه المواصفات.
                </p>
              )}
              <div className={draft ? "grid gap-2" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
                {visible.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => edit(product)}
                    disabled={busy || uploading}
                    className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-right transition-colors hover:bg-[#faf6f2] ${draft?.id === product.id ? "border-[#b58b4b] bg-[#faf6f2]" : "border-[#eee6df]"}`}
                  >
                    <img
                      src={product.images[0]}
                      alt=""
                      className="size-16 shrink-0 rounded-lg bg-[#f7f4ee] object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[10px] text-[#a88758]">
                        {product.brand || "CLARÉA"}
                      </p>
                      <h3 className="m-0 mt-1 break-words text-sm leading-6">{product.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                        <span
                          className={`rounded-full px-2 py-1 ${product.published ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}
                        >
                          {product.published ? "منشور" : "مسودة / مخفي"}
                        </span>
                        <span className="rounded-full bg-[#f5f0ec] px-2 py-1">
                          {product.available ? "متاح" : "غير متاح"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            {draft && (
              <form
                id="product-editor"
                onSubmit={save}
                className="min-w-0 scroll-mt-5 rounded-2xl border border-[#e8ddd5] bg-white p-5 sm:p-7"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="m-0 text-xs text-[#a88758]">
                      {creating ? "NEW PRODUCT" : "EDIT PRODUCT"}
                    </p>
                    <h2 className="m-0 mt-2 text-2xl">
                      {creating ? "إضافة منتج جديد" : "تفاصيل المنتج"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="إغلاق المحرر"
                    className="grid size-11 place-items-center rounded-xl bg-[#f8f5f1]"
                    disabled={busy || uploading}
                    onClick={() => {
                      if (canLeave()) {
                        setDraft(null);
                        setDirty(false);
                      }
                    }}
                  >
                    <TbX />
                  </button>
                </div>
                <fieldset disabled={busy || uploading} className="m-0 min-w-0 border-0 p-0">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm">
                      اسم المنتج
                      <input
                        required
                        maxLength={180}
                        value={draft.name}
                        onChange={(e) => change({ name: e.target.value })}
                        className={field}
                      />
                    </label>
                    <label className="text-sm">
                      الماركة
                      <input
                        maxLength={100}
                        value={draft.brand}
                        onChange={(e) => change({ brand: e.target.value })}
                        className={field}
                      />
                    </label>
                    <label className="text-sm">
                      التصنيف
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          change({ category: e.target.value as ManagedProduct["category"] })
                        }
                        className={field}
                      >
                        {Object.entries(categories).map(([key, title]) => (
                          <option key={key} value={key}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      لون خلفية المنتج
                      <input
                        type="color"
                        value={draft.tone}
                        onChange={(e) => change({ tone: e.target.value })}
                        className={`${field} !h-12 !p-2`}
                      />
                    </label>
                  </div>
                  <div className="mt-6 rounded-xl bg-[#faf7f3] p-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-4 text-sm">
                      {(
                        [
                          ["published", "إظهار على الموقع"],
                          ["available", "متاح للطلب"],
                          ["newArrival", "ضمن الجديد في Claréa"],
                        ] as const
                      ).map(([key, title]) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft[key]}
                            onChange={(e) => change({ [key]: e.target.checked })}
                            className="size-4 accent-[#5C1A2B]"
                          />
                          {title}
                        </label>
                      ))}
                    </div>
                    <p className="mb-0 mt-3 text-xs leading-6 text-[#917c73]">
                      غيّر الخيارات ثم احفظ. المنتج المخفي لا يظهر للزوار، حتى لو كان متاحًا للطلب.
                    </p>
                  </div>
                  <section className="mt-7">
                    <h3 className="m-0 text-base">صور المنتج</h3>
                    <p className="mt-2 text-xs text-[#917c73]">
                      حتى 6 صور، JPG / PNG / WebP، بحد أقصى 3 ميجابايت للصورة. أول صورة هي الرئيسية.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {draft.images.map((src, index) => (
                        <div
                          key={`${src}-${index}`}
                          className="relative rounded-xl border border-[#e8ddd5] p-2"
                        >
                          <img
                            src={src}
                            alt={`صورة المنتج ${index + 1}`}
                            className="aspect-square w-full rounded-lg object-contain"
                          />
                          <button
                            type="button"
                            aria-label={`إزالة الصورة ${index + 1}`}
                            onClick={() =>
                              change({ images: draft.images.filter((_, i) => i !== index) })
                            }
                            className="absolute left-1 top-1 grid size-9 place-items-center rounded-full border border-[#eee] bg-white"
                          >
                            <TbX />
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            className="min-h-10 w-full text-xs text-[#8b6744]"
                            onClick={() =>
                              change({
                                images: [src, ...draft.images.filter((_, i) => i !== index)],
                              })
                            }
                          >
                            {index === 0 ? "الصورة الرئيسية" : "اجعلها الرئيسية"}
                          </button>
                        </div>
                      ))}
                      {draft.images.length < 6 && (
                        <label
                          htmlFor="product-images"
                          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9ad89] bg-[#fcfaf7] text-sm"
                        >
                          <TbPhotoPlus size={28} />
                          <span>رفع صور</span>
                          <input
                            id="product-images"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              void upload(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </section>
                  <div className="mt-7 grid gap-5">
                    {(["ar", "en"] as const).map((lang) => (
                      <section key={lang} className="rounded-xl border border-[#eee6df] p-4">
                        <h3 className="m-0 mb-4 text-sm font-bold">
                          {lang === "ar" ? "المحتوى العربي" : "English content"}
                        </h3>
                        <label className="block text-sm">
                          {lang === "ar" ? "عنوان مختصر / اسم عربي" : "Short label"}
                          <input
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            maxLength={180}
                            value={draft.label[lang]}
                            onChange={(e) =>
                              change({ label: { ...draft.label, [lang]: e.target.value } })
                            }
                            className={field}
                          />
                        </label>
                        <label className="mt-4 block text-sm">
                          {lang === "ar" ? "الوصف" : "Description"}
                          <textarea
                            required
                            rows={4}
                            maxLength={4000}
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            value={draft.description[lang]}
                            onChange={(e) =>
                              change({
                                description: { ...draft.description, [lang]: e.target.value },
                              })
                            }
                            className={field}
                          />
                        </label>
                      </section>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-6 min-h-11 text-sm text-[#8b6744] underline underline-offset-4"
                    aria-expanded={advanced}
                    onClick={() => setAdvanced(!advanced)}
                  >
                    المكونات وطريقة الاستخدام (اختياري)
                  </button>
                  {advanced && (
                    <div className="mt-3 grid gap-4 rounded-xl bg-[#faf7f3] p-4">
                      <label className="text-sm">
                        حجم العبوة
                        <input
                          value={draft.details?.size || ""}
                          onChange={(e) => detail("size", "ar", e.target.value)}
                          className={field}
                        />
                      </label>
                      {(["ar", "en"] as const).map((lang) => (
                        <div key={lang}>
                          <h4 className="mb-2 text-sm">{lang === "ar" ? "بالعربية" : "English"}</h4>
                          {(
                            [
                              ["skinType", "نوع البشرة"],
                              ["ingredients", "المكونات — مكون في كل سطر"],
                              ["usage", "الاستخدام — خطوة في كل سطر"],
                              ["caution", "تنبيهات الاستخدام"],
                              ["contents", "محتويات المجموعة — قطعة في كل سطر"],
                            ] as const
                          ).map(([key, title]) => (
                            <label key={key} className="mt-3 block text-xs">
                              {title}
                              <textarea
                                rows={2}
                                dir={lang === "ar" ? "rtl" : "ltr"}
                                value={
                                  Array.isArray(draft.details?.[key]?.[lang])
                                    ? (draft.details?.[key]?.[lang] as string[]).join("\n")
                                    : (draft.details?.[key]?.[lang] as string) || ""
                                }
                                onChange={(e) => detail(key, lang, e.target.value)}
                                className={field}
                              />
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>
                {uploading && (
                  <p role="status" className="mt-5 text-sm text-[#8b6744]">
                    جارٍ رفع الصور وتجهيزها…
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-5 text-sm text-red-700">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="mt-5 text-sm text-green-800">
                    {notice}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[#e8ddd5] pt-5">
                  <button className={button} disabled={busy || uploading || !draft.images.length}>
                    <TbCheck />
                    {busy ? "جارٍ الحفظ…" : draft.published ? "حفظ ونشر المنتج" : "حفظ كمسودة"}
                  </button>
                  <span className="text-xs text-[#917c73]">
                    {dirty ? "تغييرات لم تُحفظ" : "لا توجد تغييرات معلقة"}
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
