"use client";

import Image from "next/image";
import { rememberOrder } from "../lib/recent-orders";
import Link from "next/link";
import CustomerNav from "../components/layout/customer-nav";
import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  TbShoppingBag,
  TbArrowLeft,
  TbArrowRight,
  TbCheck,
  TbTruck,
  TbHelpCircle,
  TbChevronDown,
  TbTag,
} from "react-icons/tb";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CartProvider, useCart } from "../components/cart/cart-provider";
import type { Language, Product } from "../types/catalog";
import type { Customer } from "../components/cart/cart-panel";

const primaryBtn =
  "min-h-12 w-full rounded-xl bg-[#5C1A2B] px-5 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[#481422] disabled:opacity-40";
const inputField =
  "w-full rounded-xl border border-[#dbcac0] bg-white p-3 text-sm outline-offset-4 focus:border-[#5C1A2B] focus:outline-[#C9A05C] placeholder:text-gray-400";
const money = (n: number, ar: boolean) =>
  new Intl.NumberFormat(ar ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP" }).format(n);

const EGYPT_GOVERNORATES = [
  { ar: "القاهرة", en: "Cairo" },
  { ar: "الجيزة", en: "Giza" },
  { ar: "الشيخ زايد", en: "Sheikh Zayed" },
];

type Receipt = {
  tracking_path?: string;
  reference: string;
  status: string;
  subtotal: number;
  shipping_fee: number | null;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
};

export default function CheckoutPage() {
  return (
    <CartProvider>
      <CheckoutContent />
    </CartProvider>
  );
}

function CheckoutContent() {
  const [lang, setLang] = useState<Language>("ar");
  const ar = lang === "ar";
  const cart = useCart();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Form states
  const [showPhoneHelp, setShowPhoneHelp] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(
    null,
  );
  const [discountError, setDiscountError] = useState("");

  const [customer, setCustomer] = useState<Customer>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("clarea_checkout_customer");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      emailOrPhone: "",
      emailNews: false,
      country: "Egypt",
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      city: "",
      governorate: "Cairo",
      postalCode: "",
      phone: "",
      saveInfo: true,
      smsNews: false,
    };
  });

  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setCatalog(data);
        }
      } catch {
        setError(ar ? "تعذر تحميل المنتجات" : "Could not load products");
      } finally {
        setLoading(false);
      }
    }
    void loadCatalog();
  }, [ar]);

  const items = cart.items.map((i) => {
    const p = catalog.find((prod) => prod.id === i.id);
    return {
      ...i,
      name: p?.name || i.name,
      image: p?.images[0] || i.image,
      price: p?.public_price ?? i.price,
    };
  });

  const unavailable = (id: string) =>
    !catalog.some((p) => p.id === id && p.available && p.public_price != null);
  const invalid = items.some((i) => unavailable(i.id));

  const rawSubtotal =
    Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
  const discountAmount = appliedDiscount
    ? Math.round(rawSubtotal * (appliedDiscount.percent / 100))
    : 0;
  const subtotal = rawSubtotal - discountAmount;
  const shippingFee = subtotal > 4000 ? 0 : 80;
  const total = subtotal + shippingFee;

  function handleApplyDiscount(e: FormEvent) {
    e.preventDefault();
    setDiscountError("");
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    if (code === "CLAREA10" || code === "WELCOME10") {
      setAppliedDiscount({ code, percent: 10 });
    } else {
      setDiscountError(ar ? "كوبون خصم غير صالح" : "Invalid discount code");
    }
  }

  async function handleSubmitOrder(e: FormEvent) {
    e.preventDefault();
    if (submitting.current || loading || invalid || !items.length) return;

    if (customer.saveInfo && typeof window !== "undefined") {
      try {
        localStorage.setItem("clarea_checkout_customer", JSON.stringify(customer));
      } catch {}
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    const formattedCustomer = {
      name:
        `${customer.firstName} ${customer.lastName}`.trim() ||
        customer.firstName ||
        customer.lastName ||
        "عميل",
      phone: customer.phone.trim(),
      email: customer.emailOrPhone.includes("@") ? customer.emailOrPhone.trim() : undefined,
      address: [
        customer.address.trim(),
        customer.apartment.trim() ? `شقة/ملحق: ${customer.apartment.trim()}` : "",
        customer.city.trim(),
        customer.governorate,
        "Egypt",
        customer.postalCode.trim() ? `الرمز البريدي: ${customer.postalCode.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" - "),
      firstName: customer.firstName,
      lastName: customer.lastName,
      apartment: customer.apartment,
      city: customer.city,
      governorate: customer.governorate,
      postalCode: customer.postalCode,
      country: "Egypt",
    };

    const payload = {
      customer: formattedCustomer,
      payment_method: "COD",
      shipping_acknowledged: true,
      items: items.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
        expected_price: i.price,
      })),
    };

    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, request_id: attempt.current.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || (ar ? "فشل إرسال الطلب" : "Failed to place order"));

      rememberOrder(data.order);
      setReceipt(data.order);
      cart.clear();

      toast.success(
        ar
          ? "تم استلام طلبك بنجاح! سنتواصل معك هاتفياً لتأكيد الطلب والتوصيل."
          : "Order received successfully! We will call you to confirm your order and delivery.",
        {
          position: "top-center",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
          style: { backgroundColor: "#5C1A2B", color: "#ffffff" },
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ar
            ? "تعذر إرسال الطلب. حاولي مجدداً."
            : "Couldn’t submit order. Please retry.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={`min-h-screen bg-[#fffdfa] text-[#412832] ${ar ? "font-arabic" : "font-sans"}`}
    >
      <ToastContainer />

      {/* Top Bar / Header */}
      <header className="sticky top-0 z-30 border-b border-[#e9ddd5] bg-[#fffdfa]/95 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[#5C1A2B] hover:opacity-80"
          >
            {ar ? <TbArrowRight size={18} /> : <TbArrowLeft size={18} />}
            <span>{ar ? "العودة للمتجر" : "Back to shop"}</span>
          </Link>

          <Link href="/" aria-label="Claréa" className="inline-block hover:opacity-90">
            <Image
              src="/clarea-logo-transparent.png"
              alt="Claréa"
              width={160}
              height={50}
              className="h-auto w-[120px] sm:w-[150px]"
              priority
            />
          </Link>

          <button
            onClick={() => setLang(ar ? "en" : "ar")}
            className="rounded-lg border border-[#dbcac0] px-3 py-1 text-xs font-semibold hover:bg-[#F5E9E2]"
          >
            {ar ? "English" : "العربية"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <CustomerNav ar={ar} />
        {receipt ? (
          /* Receipt / Confirmation Screen */
          <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[#e9ddd5] bg-white p-6 sm:p-10 shadow-xl text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#F5E9E2] text-[#5C1A2B]">
              <TbCheck size={40} />
            </div>
            <h1 className="text-3xl font-bold text-[#5C1A2B]">
              {ar ? "تم استلام طلبك بنجاح!" : "Order Confirmed!"}
            </h1>
            <p className="text-sm text-muted">{ar ? "رقم الطلب" : "Order Reference"}</p>
            <strong dir="ltr" className="block text-xl tracking-wider select-all text-[#5C1A2B]">
              {receipt.reference}
            </strong>
            <p className="text-sm leading-7 text-[#412832]">
              {ar
                ? "شكراً لتسوقك من Claréa! سنتواصل معك هاتفياً لتأكيد الشحن وموعد التوصيل."
                : "Thank you for shopping with Claréa! We will call you to confirm delivery and arrival time."}
            </p>

            {receipt.tracking_path && (
              <a
                href={receipt.tracking_path}
                className={primaryBtn + " flex items-center justify-center gap-2"}
              >
                {ar ? "تابعي حالة طلبك" : "Track your order"}
              </a>
            )}

            <Link
              href="/"
              className="inline-block pt-2 text-sm font-semibold text-[#5C1A2B] hover:underline"
            >
              {ar ? "العودة للتسوق" : "Continue Shopping"}
            </Link>
          </div>
        ) : cart.items.length === 0 && !loading ? (
          /* Empty Cart state */
          <div className="mx-auto max-w-md space-y-5 py-16 text-center">
            <TbShoppingBag className="mx-auto text-[#C9A05C]" size={64} />
            <h2 className="text-2xl font-bold">{ar ? "سلتك فارغة" : "Your cart is empty"}</h2>
            <p className="text-sm text-muted">
              {ar
                ? "تفقدي المنتجات وأضيفي منتجاتك المفضلة إلى السلة."
                : "Browse products and add your favourites to cart."}
            </p>
            <Link href="/" className={primaryBtn + " inline-block text-center"}>
              {ar ? "اكتشفي المنتجات" : "Explore products"}
            </Link>
          </div>
        ) : (
          /* Main 2-Column Shopify-Style Layout */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Form (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-red-50 p-4 text-sm text-red-900 border border-red-200"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitOrder} className="space-y-8">
                {/* Delivery Section */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[#412832] border-b border-[#e9ddd5] pb-3">
                    {ar ? "بيانات التوصيل" : "Delivery Details"}
                  </h2>

                  {/* First & Last name */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <input
                        required
                        type="text"
                        placeholder={ar ? "الاسم الأول" : "First name"}
                        autoComplete="given-name"
                        value={customer.firstName}
                        onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                        className={inputField}
                      />
                    </div>
                    <div>
                      <input
                        required
                        type="text"
                        placeholder={ar ? "اسم العائلة" : "Last name"}
                        autoComplete="family-name"
                        value={customer.lastName}
                        onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                        className={inputField}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <input
                      required
                      type="text"
                      placeholder={ar ? "العنوان (الشارع والمنطقة)" : "Address"}
                      autoComplete="street-address"
                      minLength={5}
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      className={inputField}
                    />
                  </div>

                  {/* Apartment (optional) */}
                  <div>
                    <input
                      type="text"
                      placeholder={
                        ar ? "الشقة، الملحق، إلخ (اختياري)" : "Apartment, suite, etc. (optional)"
                      }
                      autoComplete="address-line2"
                      value={customer.apartment}
                      onChange={(e) => setCustomer({ ...customer, apartment: e.target.value })}
                      className={inputField}
                    />
                  </div>

                  {/* City, Governorate, Postal code */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <input
                        required
                        type="text"
                        placeholder={ar ? "المدينة" : "City"}
                        autoComplete="address-level2"
                        value={customer.city}
                        onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                        className={inputField}
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={customer.governorate}
                        onChange={(e) => {
                          setCustomer({ ...customer, governorate: e.target.value });
                          e.target.blur();
                        }}
                        className={
                          inputField +
                          " cursor-pointer pe-8 appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-white"
                        }
                      >
                        {EGYPT_GOVERNORATES.map((g) => (
                          <option key={g.en} value={g.en}>
                            {ar ? g.ar : g.en}
                          </option>
                        ))}
                      </select>
                      <TbChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={16}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder={ar ? "الرمز البريدي (اختياري)" : "Postal code (optional)"}
                        autoComplete="postal-code"
                        value={customer.postalCode}
                        onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                        className={inputField}
                      />
                    </div>
                  </div>

                  <p className="m-0 rounded-lg border border-[#e9ddd5] bg-[#F5E9E2]/60 p-2.5 text-xs text-[#5C1A2B] font-medium">
                    {ar
                      ? "📌 نصل حالياً لـ: القاهرة، الجيزة، والشيخ زايد فقط."
                      : "📌 Delivery available to: Cairo, Giza, and Sheikh Zayed only."}
                  </p>

                  {/* Phone */}
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      dir="ltr"
                      placeholder={ar ? "رقم الموبايل (مثال: 01xxxxxxxxx)" : "Phone"}
                      autoComplete="tel"
                      pattern="(?:\\+?20|0)1[0125][0-9]{8}"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className={inputField + " pe-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhoneHelp(!showPhoneHelp)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Info"
                    >
                      <TbHelpCircle size={18} />
                    </button>
                  </div>
                  {showPhoneHelp && (
                    <p className="m-0 rounded-lg border border-[#e9ddd5] bg-[#F5E9E2]/50 p-2.5 text-xs leading-5 text-muted">
                      {ar
                        ? "مطلوب رقم الموبايل للتواصل معك من قبل مندوب التوصيل لتأكيد التسليم."
                        : "Phone number is required for the delivery courier to contact you."}
                    </p>
                  )}

                  {/* Checkboxes */}
                  <div className="space-y-2.5 pt-2">
                    <label className="flex items-center gap-2.5 text-sm text-[#412832] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customer.saveInfo}
                        onChange={(e) => setCustomer({ ...customer, saveInfo: e.target.checked })}
                        className="size-4 rounded border-gray-300 accent-[#5C1A2B]"
                      />
                      <span>
                        {ar
                          ? "حفظ هذه البيانات للمرة القادمة"
                          : "Save this information for next time"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-sm text-[#412832] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customer.smsNews}
                        onChange={(e) => setCustomer({ ...customer, smsNews: e.target.checked })}
                        className="size-4 rounded border-gray-300 accent-[#5C1A2B]"
                      />
                      <span>
                        {ar
                          ? "أرسل لي التحديثات والعروض عبر الرسائل النصية"
                          : "Text me with news and offers"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-[#412832] border-b border-[#e9ddd5] pb-3">
                    {ar ? "طريقة الدفع" : "Payment method"}
                  </h2>
                  <div className="rounded-2xl border-2 border-[#5C1A2B] bg-[#F5E9E2]/20 p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value="COD"
                        checked
                        readOnly
                        className="size-4 accent-[#5C1A2B]"
                      />
                      <TbTruck size={24} className="text-[#5C1A2B]" />
                      <div>
                        <strong className="block text-sm">
                          {ar ? "الدفع عند الاستلام (COD)" : "Cash on Delivery (COD)"}
                        </strong>
                        <span className="text-xs text-muted">
                          {ar
                            ? "ادفع نقداً عند استلام شحنتك"
                            : "Pay in cash when your order is delivered"}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <button type="submit" disabled={busy || invalid || loading} className={primaryBtn}>
                  {busy
                    ? ar
                      ? "جاري إرسال الطلب…"
                      : "Placing Order…"
                    : ar
                      ? "إتمام الطلب — الدفع عند الاستلام"
                      : "Complete Order — Pay on Delivery"}
                </button>
              </form>
            </div>

            {/* Right Column: Order Summary Sidebar (5 cols) */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 space-y-6 rounded-3xl border border-[#e9ddd5] bg-[#F5E9E2]/40 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-[#5C1A2B]">
                  {ar ? "ملخص الطلب" : "Order Summary"}
                </h2>

                {/* Item List */}
                <ul className="divide-y divide-[#e9ddd5] p-0 m-0 list-none space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 pt-3 first:pt-0">
                      <div className="relative">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={76}
                          className="h-16 w-16 rounded-xl bg-white object-contain border border-[#e9ddd5] p-1"
                        />
                        <span className="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-[#5C1A2B] text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold line-clamp-2 leading-5">
                          {item.name}
                        </h4>
                        <span className="text-xs text-muted">{money(item.price, ar)}</span>
                      </div>
                      <strong className="text-sm shrink-0">
                        {money(item.price * item.quantity, ar)}
                      </strong>
                    </li>
                  ))}
                </ul>

                {/* Discount Code Form */}
                <form
                  onSubmit={handleApplyDiscount}
                  className="space-y-2 pt-2 border-t border-[#e9ddd5]"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={ar ? "كود الخصم أو كارت الهدية" : "Discount code or gift card"}
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className={inputField + " flex-1 uppercase"}
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#5C1A2B] px-4 text-xs font-bold text-white hover:bg-[#481422]"
                    >
                      {ar ? "تطبيق" : "Apply"}
                    </button>
                  </div>
                  {appliedDiscount && (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <TbTag size={14} />
                      {ar
                        ? `تم تطبيق خصم ${appliedDiscount.percent}% (${appliedDiscount.code})`
                        : `${appliedDiscount.percent}% discount applied (${appliedDiscount.code})`}
                    </p>
                  )}
                  {discountError && <p className="text-xs text-red-600">{discountError}</p>}
                </form>

                {/* Totals Breakdown */}
                <div className="space-y-3 pt-3 border-t border-[#e9ddd5] text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">{ar ? "الإجمالي الفرعي" : "Subtotal"}</span>
                    <strong>{money(rawSubtotal, ar)}</strong>
                  </div>

                  {appliedDiscount && (
                    <div className="flex justify-between text-emerald-700">
                      <span>{ar ? "الخصم" : "Discount"}</span>
                      <strong>-{money(discountAmount, ar)}</strong>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted">{ar ? "الشحن" : "Shipping"}</span>
                    <span>
                      {shippingFee === 0 ? (ar ? "مجاناً" : "Free") : money(shippingFee, ar)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 border-t border-[#e9ddd5]">
                    <span className="text-base font-bold">{ar ? "الإجمالي الكلي" : "Total"}</span>
                    <div className="text-end">
                      <span className="text-xs text-muted me-1">EGP</span>
                      <strong className="text-2xl font-black text-[#5C1A2B]">
                        {money(total, ar)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
