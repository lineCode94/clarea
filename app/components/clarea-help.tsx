"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TbMessageCircle, TbX, TbSend, TbBrandWhatsapp, TbArrowUpRight } from "react-icons/tb";
import { text } from "../content/catalog";
import { useProducts } from "./catalog-provider";
import { whatsappLink } from "../lib/whatsapp";
import type { Language, Product } from "../types/catalog";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const keywords = [
  ["متاح", "متوفر", "توفر", "available", "availability", "stock"],
  [
    "اطلب",
    "طلب",
    "order",
    "buy",
    "شراء",
    "اشتري",
    "سعر",
    "بكام",
    "price",
    "shipping",
    "delivery",
    "شحن",
    "توصيل",
  ],
  ["اختار", "اختيار", "choose", "help", "بشره", "بشرة", "روتين", "routine"],
  ["الجديد", "جديد", "new", "arrivals"],
];

export default function ClareaHelp({
  lang,
  onSelect,
  onBrowse,
}: {
  lang: Language;
  onSelect: (product: Product) => void;
  onBrowse: (category: string, query: string, available: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const products = useProducts();
  const [locale, setLocale] = useState(lang);
  const [query, setQuery] = useState("");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const sending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/chat", { cache: "no-store", signal: controller.signal })
      .then((r) => r.json())
      .then((v) => setAiAvailable(v.enabled === true))
      .catch(() => {});
    return () => {
      controller.abort();
      generation.current++;
    };
  }, []);
  const [messages, setMessages] = useState<
    { question: string; answer: string; productIds?: string[]; source?: string }[]
  >([]);
  const ar = locale === "ar";
  const faqs = text[locale].faqs;
  const search = normalize(query);
  const stop = new Set([
    "هل",
    "عندكم",
    "عايز",
    "عايزه",
    "عايزة",
    "محتاج",
    "محتاجه",
    "محتاجة",
    "ممكن",
    "من",
    "في",
    "هو",
    "ايه",
    "متاح",
    "متوفر",
    "the",
    "a",
    "is",
    "do",
    "you",
    "have",
    "want",
    "need",
    "available",
  ]);
  const aliases: Record<string, string> = {
    واقي: "sun",
    شمس: "sun",
    سنتيلا: "centella",
    امبول: "ampoule",
    تونر: "toner",
    عين: "eye",
    كريم: "cream",
  };
  const terms = Array.from(
    new Set(
      search
        .split(" ")
        .filter((word) => word.length >= 2 && !stop.has(word))
        .map((word) => aliases[word] || word),
    ),
  );
  const matches = terms.length
    ? products
        .filter((p) => {
          const haystack = normalize(`${p.name} ${p.brand} ${p.label.ar} ${p.label.en}`);
          return terms.every((term) => haystack.includes(term));
        })
        .slice(0, 4)
    : [];
  useEffect(() => {
    history.current?.scrollTo({ top: history.current.scrollHeight, behavior: "instant" });
  }, [messages]);
  function answer(question: string, reply: string, productIds?: string[]) {
    setMessages((previous) => [...previous.slice(-19), { question, answer: reply, productIds }]);
    setQuery("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!search || sending.current) return;
    if (keywords[3].some((word) => search.includes(normalize(word)))) {
      answer(query.trim(), faqs[3][1]);
      return;
    }
    if (matches.length) {
      answer(
        query.trim(),
        ar
          ? "لقيت المنتجات دي؛ اختاري منتج لعرض التفاصيل والتوفر."
          : "Here are matching products. Select one to view details and availability.",
        matches.map((p) => p.id),
      );
      return;
    }
    const index = keywords.findIndex((words) =>
      words.some((word) => search.includes(normalize(word))),
    );
    if (index >= 0) {
      answer(query.trim(), faqs[index][1]);
      return;
    }
    const question = query.trim();
    const saved = ar
      ? "ما عنديش إجابة جاهزة مؤكدة للسؤال ده. اختاري من الأسئلة السريعة، أو اسألي فريق Claréa على واتساب."
      : "I don't have a verified saved answer. Use a quick question or ask the Claréa team on WhatsApp.";
    if (!aiAvailable || !aiConsent) {
      answer(question, saved);
      return;
    }
    const turn = generation.current;
    sending.current = true;
    setPending(true);
    setQuery("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          message: question,
          lang: locale,
          adultConfirmed: true,
          consent: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || typeof body.answer !== "string") throw new Error("Unavailable");
      if (turn === generation.current)
        setMessages((previous) => [
          ...previous.slice(-19),
          {
            question,
            answer: body.answer,
            productIds: Array.isArray(body.productIds) ? body.productIds : [],
            source: body.source,
          },
        ]);
    } catch {
      if (turn === generation.current)
        setMessages((previous) => [...previous.slice(-19), { question, answer: saved }]);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  function changeLanguage() {
    generation.current++;
    setLocale(ar ? "en" : "ar");
    setMessages([]);
    setQuery("");
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setLocale(lang);
          dialog.current?.showModal();
        }}
        aria-label={lang === "ar" ? "افتح مساعد Claréa" : "Open Claréa helper"}
        className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-40 flex min-h-12 items-center gap-2 rounded-full border border-[#dccbb5] bg-[#fffaf3] px-4 text-[#5C1A2B] shadow-lg xl:bottom-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <TbMessageCircle size={23} />
        <span className="hidden text-xs font-bold sm:inline">
          {lang === "ar" ? "اسألي Claréa" : "Ask Claréa"}
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label={ar ? "مساعد Claréa" : "Claréa helper"}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-0 m-auto h-[min(660px,calc(100dvh-32px))] max-h-none w-[min(410px,calc(100vw-24px))] max-w-none overflow-hidden rounded-3xl border border-[#e8ddd5] bg-[#fffdf9] p-0 text-[#412832] shadow-2xl backdrop:bg-black/25 sm:inset-auto sm:bottom-5 sm:right-5"
      >
        <div
          dir={ar ? "rtl" : "ltr"}
          className={`flex h-full flex-col ${ar ? "font-arabic" : "font-sans"}`}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-[#e8ddd5] p-4">
            <img src="/pwa/icon-192-logo-v3.png" alt="" className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-base">{ar ? "مساعد Claréa" : "Claréa helper"}</h2>
              <p className="m-0 mt-1 text-[11px] text-[#917c73]">
                {aiAvailable && aiConsent
                  ? ar
                    ? "Gemini · قد يخطئ، أكدي التفاصيل معنا"
                    : "Gemini · Confirm details with our team"
                  : ar
                    ? "إجابات جاهزة من معلومات المتجر"
                    : "Saved answers from our store"}
              </p>
            </div>
            <button
              type="button"
              onClick={changeLanguage}
              aria-label={ar ? "Switch helper to English" : "تغيير لغة المساعد للعربية"}
              className="min-h-11 px-2 text-xs"
            >
              {ar ? "EN" : "عربي"}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={ar ? "إغلاق المساعد" : "Close helper"}
              className="grid size-11 place-items-center rounded-full hover:bg-[#f5ece7]"
            >
              <TbX size={22} />
            </button>
          </header>
          <div ref={history} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <p className="mt-0 rounded-2xl bg-[#f5eee5] p-4 text-sm leading-7">
              {ar
                ? "أهلًا بيكي في Claréa 🤍 اختاري سؤال أو اكتبي كلمة زي «شحن» أو «السعر». للمنتجات، ابحثي باسم المنتج أو الماركة."
                : "Welcome to Claréa 🤍 Choose a question or type a keyword like shipping or price. Search a product or brand name to see its details."}
            </p>
            {aiAvailable && (
              <label className="mb-4 flex items-start gap-2 rounded-xl border border-[#e8ddd5] p-3 text-xs leading-6">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  disabled={pending}
                  onChange={(e) => setAiConsent(e.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[#5C1A2B]"
                />
                <span>
                  {ar
                    ? "عمري 18+ وأوافق على إرسال أسئلتي غير الجاهزة إلى Google Gemini. قد تستخدم Google الأسئلة والردود لتحسين خدماتها. لا تكتبي بيانات شخصية أو صحية. الإجابات الجاهزة متاحة بدون AI."
                    : "I am 18+ and agree to send questions without saved answers to Google Gemini. Google may use questions and replies to improve its services. Do not enter personal or health information. Saved answers work without AI."}
                </span>
              </label>
            )}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  dialog.current?.close();
                  document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="min-h-10 rounded-full bg-[#5C1A2B] px-3 py-2 text-xs text-white"
              >
                New to Claréa
              </button>
              {[
                {
                  label: ar ? "المتاح دلوقتي" : "Available now",
                  category: "all",
                  query: "",
                  available: true,
                },
                {
                  label: ar ? "واقي الشمس" : "Sun protection",
                  category: "skin",
                  query: "sun",
                  available: false,
                },
                {
                  label: ar ? "العناية بالشعر" : "Haircare",
                  category: "hair",
                  query: "",
                  available: false,
                },
              ].map((item) => (
                <button
                  key={item.category + item.query}
                  type="button"
                  onClick={() => {
                    dialog.current?.close();
                    onBrowse(item.category, item.query, item.available);
                  }}
                  className="min-h-10 rounded-full bg-[#5C1A2B] px-3 py-2 text-xs text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mb-5 grid gap-2">
              {faqs.map(([q, a]) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => answer(q, a)}
                  className="rounded-xl border border-[#e8ddd5] px-3 py-3 text-start text-xs leading-5 hover:bg-[#f5eee5]"
                >
                  {q}
                </button>
              ))}
            </div>
            <div role="log" aria-live="polite" aria-relevant="additions" className="grid gap-4">
              {messages.map((m, i) => (
                <div key={i} className="grid gap-2">
                  <p className="m-0 max-w-[90%] justify-self-end whitespace-pre-wrap break-words rounded-2xl bg-[#5C1A2B] px-4 py-3 text-sm text-white">
                    {m.question}
                  </p>
                  <p className="m-0 whitespace-pre-wrap break-words rounded-2xl bg-[#f5eee5] px-4 py-3 text-sm leading-7">
                    {m.answer}
                    {m.source === "gemini" && (
                      <span className="mt-2 block text-[10px] text-[#917c73]">
                        {ar ? "رد مولّد بواسطة Gemini" : "Generated by Gemini"}
                      </span>
                    )}
                  </p>
                  {m.productIds
                    ?.map((id) => products.find((p) => p.id === id))
                    .filter((p) => p !== undefined)
                    .map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          dialog.current?.close();
                          onSelect(product);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-[#e8ddd5] p-3 text-start text-xs"
                      >
                        <img src={product.images[0]} alt="" className="size-10 object-contain" />
                        <span className="flex-1">
                          {product.name}
                          <span className="mt-1 block text-[#917c73]">
                            {product.available
                              ? ar
                                ? "متاح للطلب"
                                : "Available"
                              : ar
                                ? "غير متاح حاليًا"
                                : "Currently unavailable"}
                          </span>
                        </span>
                        <TbArrowUpRight />
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
          {pending && (
            <p role="status" className="m-0 px-4 py-2 text-xs text-[#917c73]">
              {ar ? "Claréa بتجهز الرد…" : "Claréa is preparing a reply…"}
            </p>
          )}
          <div className="shrink-0 border-t border-[#e8ddd5] bg-[#fffdf9] p-3">
            {matches.length > 0 && (
              <div
                aria-label={ar ? "منتجات مطابقة" : "Matching products"}
                className="mb-2 max-h-40 overflow-y-auto"
              >
                {matches.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      dialog.current?.close();
                      onSelect(product);
                    }}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg bg-[#f5eee5] p-2 text-start text-xs"
                  >
                    <img src={product.images[0]} alt="" className="size-9 rounded object-contain" />
                    <span className="flex-1">{product.name}</span>
                    <TbArrowUpRight />
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={submit} className="flex gap-2">
              <input
                aria-label={ar ? "سؤالك أو اسم المنتج" : "Question or product name"}
                maxLength={500}
                disabled={pending}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ar ? "سؤال أو اسم منتج…" : "Question or product name…"}
                className="min-w-0 flex-1 rounded-xl border border-[#e3d7d1] bg-white px-3 py-3 text-base outline-none focus:border-[#9f7952]"
              />
              <button
                type="submit"
                disabled={!search || pending}
                aria-label={ar ? "إرسال السؤال" : "Send question"}
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#5C1A2B] text-white disabled:opacity-40"
              >
                <TbSend size={20} />
              </button>
            </form>
            <a
              href={whatsappLink(locale)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex min-h-10 items-center justify-center gap-2 text-xs text-[#5C1A2B]"
            >
              <TbBrandWhatsapp size={19} />
              {ar ? "اسألي فريق Claréa على واتساب" : "Ask the Claréa team on WhatsApp"}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
