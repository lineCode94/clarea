"use client";
import SaveTrackingLink from "../save-tracking-link";
import Image from "next/image";
import { rememberOrder, setOrderAttention } from "../../lib/recent-orders";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  TbShoppingBag,
  TbX,
  TbMinus,
  TbPlus,
  TbTrash,
  TbCheck,
  TbTruck,
  TbArrowLeft,
  TbHelpCircle,
  TbChevronDown,
} from "react-icons/tb";
import { useCart, type CartLine } from "./cart-provider";
import type { Language, Product } from "../../types/catalog";
const primary =
  "min-h-12 rounded-xl bg-[#5C1A2B] px-5 py-3 font-semibold text-white disabled:opacity-40";
const secondary = "min-h-11 rounded-xl border border-[#dbcac0] px-4 py-2 disabled:opacity-40";
const field =
  "mt-1.5 w-full rounded-xl border border-[#dbcac0] bg-white p-3 text-sm outline-offset-4 focus:outline-[#C9A05C] placeholder:text-gray-400";
const money = (n: number, ar: boolean) =>
  new Intl.NumberFormat(ar ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP" }).format(n);
type Receipt = {
  tracking_path?: string;
  reference: string;
  status: string;
  subtotal: number;
  shipping_fee: number | null;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
};
export type Customer = {
  emailOrPhone: string;
  emailNews: boolean;
  country: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  governorate: string;
  postalCode: string;
  phone: string;
  saveInfo: boolean;
  smsNews: boolean;
};
export function CartButton({ lang }: { lang: Language }) {
  const cart = useCart(),
    count = cart.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <button
      type="button"
      disabled={!cart.ready}
      onClick={() => cart.setOpen(true)}
      aria-label={lang === "ar" ? `السلة، ${count} قطعة` : `Shopping bag, ${count} items`}
      className="relative grid size-10 shrink-0 place-items-center rounded-full text-brand hover:bg-brand/5"
    >
      <TbShoppingBag size={23} />
      {count > 0 && (
        <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">
          {count}
        </span>
      )}
    </button>
  );
}
function CartItem({
  item,
  ar,
  unavailable,
}: {
  item: CartLine;
  ar: boolean;
  unavailable: boolean;
}) {
  const cart = useCart();
  return (
    <li className="flex gap-3 border-b border-[#e9ddd5] py-5">
      <Image
        src={item.image}
        alt=""
        width={72}
        height={90}
        className="h-24 w-16 shrink-0 rounded-xl bg-[#F5E9E2] object-contain"
      />
      <div className="min-w-0 flex-1">
        <h3 className="m-0 text-sm font-semibold leading-6">{item.name}</h3>
        <p className="my-1 text-sm text-muted">{money(item.price, ar)}</p>
        {unavailable && (
          <p className="text-sm text-red-800">
            {ar
              ? "غير متاح حالياً — احذفيه للمتابعة"
              : "Currently unavailable — remove to continue"}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center rounded-lg border border-[#dbcac0]">
            <button
              type="button"
              className="grid size-10 place-items-center"
              onClick={() => cart.quantity(item.id, item.quantity - 1)}
              aria-label={ar ? "تقليل الكمية" : "Decrease quantity"}
            >
              <TbMinus />
            </button>
            <span className="min-w-6 text-center" aria-label={ar ? "الكمية" : "Quantity"}>
              {item.quantity}
            </span>
            <button
              type="button"
              disabled={item.quantity >= 20}
              className="grid size-10 place-items-center disabled:opacity-30"
              onClick={() => cart.quantity(item.id, item.quantity + 1)}
              aria-label={ar ? "زيادة الكمية" : "Increase quantity"}
            >
              <TbPlus />
            </button>
          </div>
          <strong className="text-sm">
            {money(Math.round(item.price * item.quantity * 100) / 100, ar)}
          </strong>
          <button
            type="button"
            className="grid size-10 place-items-center text-muted"
            onClick={() => cart.quantity(item.id, 0)}
            aria-label={ar ? "حذف المنتج" : "Remove item"}
          >
            <TbTrash />
          </button>
        </div>
      </div>
    </li>
  );
}
function CartSummary({ total, ar }: { total: number; ar: boolean }) {
  return (
    <div className="space-y-3 rounded-2xl bg-[#F5E9E2]/60 p-4 text-sm">
      <div className="flex justify-between gap-3">
        <span>{ar ? "إجمالي المنتجات" : "Products subtotal"}</span>
        <strong>{money(total, ar)}</strong>
      </div>
      <div className="flex justify-between gap-3">
        <span>{ar ? "الشحن" : "Delivery"}</span>
        <span>{ar ? "يُحدد حسب عنوان التوصيل" : "Based on delivery address"}</span>
      </div>
      <p className="m-0 leading-6 text-muted">
        {ar
          ? "هنأكد التوفر وموعد التوصيل بالتليفون قبل تجهيز الطلب."
          : "We’ll call to confirm availability and delivery time before preparing your order."}
      </p>
    </div>
  );
}
function PaymentMethodSelector({ ar }: { ar: boolean }) {
  return (
    <fieldset className="rounded-2xl border border-[#C9A05C] p-4">
      <legend className="px-2 text-sm font-semibold">
        {ar ? "طريقة الدفع" : "Payment method"}
      </legend>
      <label className="flex items-center gap-3">
        <input type="radio" name="payment" value="COD" checked readOnly />
        <TbTruck size={23} />
        <span>{ar ? "الدفع عند الاستلام" : "Cash on delivery"}</span>
      </label>
    </fieldset>
  );
}
const EGYPT_GOVERNORATES = [
  { ar: "القاهرة", en: "Cairo" },
  { ar: "الجيزة", en: "Giza" },
  { ar: "الشيخ زايد", en: "Sheikh Zayed" },
];

function CheckoutForm({
  ar,
  customer,
  setCustomer,
  onReview,
}: {
  ar: boolean;
  customer: Customer;
  setCustomer: (c: Customer) => void;
  onReview: () => void;
}) {
  const [showContactHelp, setShowContactHelp] = useState(false);
  const [showPhoneHelp, setShowPhoneHelp] = useState(false);

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (customer.saveInfo && typeof window !== "undefined") {
          try {
            localStorage.setItem("clarea_checkout_customer", JSON.stringify(customer));
          } catch {}
        }
        onReview();
      }}
      className="space-y-6"
    >
      {/* Delivery Section */}
      <div className="space-y-3.5">
        <h3 className="text-[#412832] text-lg font-bold">
          {ar ? "بيانات التوصيل" : "Delivery Details"}
        </h3>

        {/* First name & Last name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              required
              type="text"
              placeholder={ar ? "الاسم الأول" : "First name"}
              autoComplete="given-name"
              value={customer.firstName}
              onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
              className={field}
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
              className={field}
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
            className={field}
          />
        </div>

        {/* Apartment, suite, etc. (optional) */}
        <div>
          <input
            type="text"
            placeholder={ar ? "الشقة، الملحق، إلخ (اختياري)" : "Apartment, suite, etc. (optional)"}
            autoComplete="address-line2"
            value={customer.apartment}
            onChange={(e) => setCustomer({ ...customer, apartment: e.target.value })}
            className={field}
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
              className={field}
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
                field +
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
              className={field}
            />
          </div>
        </div>

        <p className="m-0 rounded-lg border border-[#e9ddd5] bg-[#F5E9E2]/60 p-2.5 text-xs text-[#5C1A2B] font-medium">
          {ar
            ? "📌 نصل حالياً لـ: القاهرة، الجيزة، والشيخ زايد فقط."
            : "📌 Delivery available to: Cairo, Giza, and Sheikh Zayed only."}
        </p>

        <label className="block text-sm">
          {ar
            ? "الإيميل (اختياري لحفظ الطلب في حسابك لاحقاً)"
            : "Email (optional, to find this order in your account later)"}
          <input
            type="email"
            autoComplete="email"
            dir="ltr"
            maxLength={254}
            value={customer.emailOrPhone}
            onChange={(e) => setCustomer({ ...customer, emailOrPhone: e.target.value })}
            className="mt-2 w-full rounded-xl border border-[#dbcac0] p-3"
          />
        </label>
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
            className={field + " pe-10"}
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
              : "Phone number is required for the shipping courier to contact you."}
          </p>
        )}

        {/* Checkboxes */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2.5 text-sm text-[#412832] cursor-pointer">
            <input
              type="checkbox"
              checked={customer.saveInfo}
              onChange={(e) => setCustomer({ ...customer, saveInfo: e.target.checked })}
              className="size-4 rounded border-gray-300 accent-[#5C1A2B]"
            />
            <span>
              {ar ? "حفظ هذه البيانات للمرة القادمة" : "Save this information for next time"}
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
              {ar ? "أرسل لي التحديثات والعروض عبر الرسائل النصية" : "Text me with news and offers"}
            </span>
          </label>
        </div>
      </div>

      <PaymentMethodSelector ar={ar} />
      <button className={primary + " w-full font-bold"}>
        {ar ? "مراجعة الطلب" : "Review order"}
      </button>
    </form>
  );
}
function OrderConfirmation({
  receipt,
  ar,
  close,
}: {
  receipt: Receipt;
  ar: boolean;
  close: () => void;
}) {
  return (
    <div className="space-y-5 py-5 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#F5E9E2] text-[#5C1A2B]">
        <TbCheck size={32} />
      </div>
      <h3 className="text-2xl">{ar ? "وصلنا طلبك" : "We’ve received your order"}</h3>
      <p className="text-sm text-muted">{ar ? "رقم الطلب" : "Order reference"}</p>
      <strong dir="ltr" className="block select-all text-lg">
        {receipt.reference}
      </strong>
      <p className="text-sm leading-7">
        {ar
          ? "هنكلمك لتأكيد التوفر والشحن وموعد التوصيل. يتم تأكيد طلبك عند الاستلام والدفع."
          : "We’ll call to confirm availability, delivery cost and estimated arrival. Your order will be confirmed upon delivery and payment"}
      </p>
      <ul className="space-y-3 p-0 text-start">
        {receipt.items.map((i, n) => (
          <li key={n} className="flex list-none justify-between gap-3 text-sm">
            <span>
              {i.name} × {i.quantity}
            </span>
            <strong className="shrink-0">{money(i.subtotal, ar)}</strong>
          </li>
        ))}
      </ul>
      {receipt.tracking_path && (
        <div className="space-y-2">
          <a
            href={receipt.tracking_path}
            className={primary + " flex w-full items-center justify-center"}
          >
            {ar ? "تابعي حالة طلبك" : "Track your order"}
          </a>
          <SaveTrackingLink path={receipt.tracking_path} ar={ar} />
          <p className="text-xs leading-6 text-muted">
            {ar
              ? "احتفظي برابط المتابعة علشان ترجعي له في أي وقت."
              : "Save your tracking link to check back anytime."}
          </p>
        </div>
      )}
      <CartSummary total={receipt.subtotal} ar={ar} />
      <button onClick={close} className={primary + " w-full"}>
        {ar ? "كمّلي التسوق" : "Continue shopping"}
      </button>
    </div>
  );
}
export default function CartPanel({ lang }: { lang: Language }) {
  const cart = useCart();
  return cart.open ? <CartDialog lang={lang} /> : null;
}
function CartDialog({ lang }: { lang: Language }) {
  const ar = lang === "ar",
    cart = useCart(),
    dialog = useRef<HTMLDialogElement>(null);
  const [catalog, setCatalog] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [step, setStep] = useState<"cart" | "details" | "review">("cart"),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [ack, setAck] = useState(false);
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
      saveInfo: false,
      smsNews: false,
    };
  });
  const attempt = useRef<{ signature: string; id: string } | null>(null),
    submitting = useRef(false);
  useEffect(() => {
    const el = dialog.current!,
      previous = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const products = await response.json();
      if (!Array.isArray(products)) throw new Error();
      setCatalog(products);
    } catch {
      setError(
        ar ? "تعذر تحديث السلة. حاولي مرة أخرى." : "Couldn’t refresh your bag. Please try again.",
      );
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const items = cart.items.map((i) => {
    const p = catalog.find((p) => p.id === i.id);
    return {
      ...i,
      name: p?.name || i.name,
      image: p?.images[0] || i.image,
      price: p?.public_price ?? i.price,
    };
  });
  const unavailable = (id: string) =>
    !catalog.some((p) => p.id === id && p.available && p.public_price != null);
  const invalid = items.some((i) => unavailable(i.id)),
    total = Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
  const close = () => {
    if (!submitting.current) cart.setOpen(false);
  };
  async function submit() {
    if (submitting.current || loading || invalid || !ack || !items.length) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const formattedCustomer = {
      name:
        `${customer.firstName} ${customer.lastName}`.trim() ||
        customer.firstName ||
        customer.lastName ||
        "عميل",
      phone:
        customer.phone.trim() ||
        (customer.emailOrPhone.match(/^(?:\+?20|0)1[0125]\d{8}$/)
          ? customer.emailOrPhone.trim()
          : ""),
      email: customer.emailOrPhone.includes("@") ? customer.emailOrPhone.trim() : undefined,
      address: [
        customer.address.trim(),
        customer.apartment.trim() ? `شقة/ملحق: ${customer.apartment.trim()}` : "",
        customer.city.trim(),
        customer.governorate,
        customer.country || "Egypt",
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
      country: customer.country,
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
      if (!response.ok) throw new Error(data.error || "Please try again");
      rememberOrder(data.order);
      setOrderAttention(true);
      setReceipt(data.order);
      cart.clear();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : ar
            ? "تعذر إرسال الطلب. حاولي مجدداً."
            : "Couldn’t submit. Please retry.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby="cart-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[94dvh] w-[min(560px,calc(100%-16px))] overflow-y-auto rounded-3xl border-0 bg-[#fffdfa] p-0 text-[#412832] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e9ddd5] bg-[#fffdfa] px-5 py-4">
        <h2 id="cart-title" className="m-0 text-xl">
          {receipt
            ? "Claréa"
            : step === "cart"
              ? ar
                ? "سلة التسوق"
                : "Your shopping bag"
              : ar
                ? "إتمام الطلب"
                : "Checkout"}
        </h2>
        <button
          autoFocus
          type="button"
          disabled={busy}
          onClick={close}
          aria-label={ar ? "إغلاق" : "Close"}
          className="grid size-11 place-items-center rounded-full hover:bg-[#F5E9E2]"
        >
          <TbX size={23} />
        </button>
      </div>
      <div className="p-5 sm:p-7">
        {receipt ? (
          <OrderConfirmation receipt={receipt} ar={ar} close={close} />
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"
              >
                {error}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep("cart");
                    void refresh();
                  }}
                  className="mt-2 block underline"
                >
                  {ar ? "تحديث السلة" : "Refresh bag"}
                </button>
              </div>
            )}
            {items.length === 0 ? (
              <div className="space-y-5 py-12 text-center">
                <TbShoppingBag className="mx-auto text-[#C9A05C]" size={48} />
                <h3 className="text-xl">{ar ? "سلتك لسه فاضية" : "Your bag is empty"}</h3>
                <p className="text-sm text-muted">
                  {ar
                    ? "اختاري منتجاتك المفضلة وابدئي من هنا."
                    : "Find your favourites and make them yours."}
                </p>
                <button onClick={close} className={primary}>
                  {ar ? "اكتشفي المنتجات" : "Explore products"}
                </button>
              </div>
            ) : (
              <>
                {step !== "cart" && (
                  <button
                    disabled={busy}
                    onClick={() => setStep(step === "review" ? "details" : "cart")}
                    className="mb-4 flex min-h-11 items-center gap-2 text-sm"
                  >
                    <TbArrowLeft />
                    {ar ? "رجوع" : "Back"}
                  </button>
                )}
                {step === "cart" && (
                  <>
                    <ul className="m-0 list-none p-0">
                      {items.map((i) => (
                        <CartItem
                          key={i.id}
                          item={i}
                          ar={ar}
                          unavailable={!loading && unavailable(i.id)}
                        />
                      ))}
                    </ul>
                    <div className="my-5">
                      <CartSummary total={total} ar={ar} />
                    </div>
                    <a
                      href="/checkout"
                      onClick={() => cart.setOpen(false)}
                      className={
                        primary + " flex w-full items-center justify-center font-bold text-center"
                      }
                    >
                      {loading
                        ? ar
                          ? "تحديث الأسعار…"
                          : "Updating prices…"
                        : ar
                          ? "متابعة الطلب وإتمام الشراء"
                          : "Continue to checkout"}
                    </a>
                  </>
                )}
                {step === "details" && (
                  <CheckoutForm
                    ar={ar}
                    customer={customer}
                    setCustomer={setCustomer}
                    onReview={() => {
                      setAck(false);
                      setStep("review");
                    }}
                  />
                )}
                {step === "review" && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-bold">{ar ? "راجعي طلبك" : "Review your order"}</h3>
                    <div className="rounded-xl border border-[#e9ddd5] bg-[#F5E9E2]/30 p-4 text-sm leading-7">
                      <strong className="block text-base">
                        {customer.firstName} {customer.lastName}
                      </strong>
                      <div dir="ltr" className="text-muted">
                        {customer.phone || customer.emailOrPhone}
                      </div>
                      {customer.emailOrPhone.includes("@") && (
                        <div dir="ltr" className="text-xs text-muted">
                          {customer.emailOrPhone}
                        </div>
                      )}
                      <p className="m-0 mt-1.5 whitespace-pre-line break-words text-[#412832]">
                        {[
                          customer.address,
                          customer.apartment ? `شقة/ملحق: ${customer.apartment}` : "",
                          customer.city,
                          customer.governorate,
                          customer.country || "Egypt",
                          customer.postalCode ? `الرمز البريدي: ${customer.postalCode}` : "",
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    </div>
                    <ul className="space-y-3 p-0">
                      {items.map((i) => (
                        <li key={i.id} className="flex list-none justify-between gap-3 text-sm">
                          <span>
                            {i.name} × {i.quantity}
                          </span>
                          <strong className="shrink-0">{money(i.price * i.quantity, ar)}</strong>
                        </li>
                      ))}
                    </ul>
                    <CartSummary total={total} ar={ar} />
                    <PaymentMethodSelector ar={ar} />
                    <label className="flex items-start gap-3 text-sm leading-6">
                      <input
                        type="checkbox"
                        checked={ack}
                        disabled={busy}
                        onChange={(e) => setAck(e.target.checked)}
                        className="mt-1 size-4 shrink-0"
                      />
                      {ar
                        ? "موافقة على التواصل معايا لتأكيد الطلب والتوفر وتكلفة الشحن وموعد التوصيل قبل التجهيز."
                        : "I agree to be contacted to confirm my order, availability, delivery cost and arrival time before preparation."}
                    </label>
                    <button
                      disabled={busy || !ack || invalid || loading}
                      onClick={() => void submit()}
                      className={primary + " w-full"}
                    >
                      {busy
                        ? ar
                          ? "جاري إرسال الطلب…"
                          : "Placing order…"
                        : ar
                          ? "إرسال الطلب — الدفع عند الاستلام"
                          : "Place order — pay on delivery"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
