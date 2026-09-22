"use client";
import Image from "next/image";
import ProductPrice from "./product-price";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbX, TbBrandWhatsapp } from "react-icons/tb";
import type { Product, Language } from "../../types/catalog";
import { whatsappLink } from "../../lib/whatsapp";
import { text } from "../../content/catalog";
import { cleansingCopy, oilIngredients, foamIngredients } from "../../data/cleansing";
import ProductDetails from "./product-details";
export default function ProductDialog({
  product,
  lang,
  close,
}: {
  product: Product;
  lang: Language;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const t = text[lang];
  const reduced = useReducedMotion();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const change = (step: number) =>
    setIndex((i) => (i + step + product.images.length) % product.images.length);
  return (
    <dialog
      ref={ref}
      dir={lang === "ar" ? "rtl" : "ltr"}
      aria-labelledby="product-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") change(1);
        if (e.key === "ArrowLeft") change(-1);
      }}
      className="product-dialog m-auto max-h-[90dvh] w-[min(1000px,calc(100%-24px))] overflow-y-auto rounded-lg border-0 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
    >
      <button
        autoFocus
        type="button"
        aria-label={t.close}
        title={t.close}
        onClick={close}
        className="absolute end-3 top-3 z-20 grid size-11 place-items-center rounded-full border border-line bg-white"
      >
        <TbX size={23} />
      </button>
      <div className="grid md:grid-cols-2">
        <div className="min-w-0 p-6 pt-16" style={{ background: product.tone }}>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, x: reduced ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -20 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={product.images[index]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 450px"
                  className="object-contain"
                  style={{ transform: index === 0 ? product.imageTransform : undefined }}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          {product.images.length > 1 && (
            <div dir="ltr" className="mt-4 flex items-center justify-between gap-3">
              <button
                title={t.previous}
                aria-label={t.previous}
                onClick={() => change(-1)}
                className="grid size-11 place-items-center rounded-full border border-line bg-white"
              >
                <TbArrowLeft size={20} />
              </button>
              <div className="flex gap-2">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    aria-label={`${i + 1}`}
                    aria-pressed={index === i}
                    onClick={() => setIndex(i)}
                    className={`size-14 overflow-hidden rounded border-2 ${index === i ? "border-brand" : "border-transparent"}`}
                  >
                    <Image
                      src={src}
                      alt=""
                      width={56}
                      height={56}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <button
                title={t.next}
                aria-label={t.next}
                onClick={() => change(1)}
                className="grid size-11 place-items-center rounded-full border border-line bg-white"
              >
                <TbArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
        <div className="min-w-0 p-6 md:p-10 md:pt-20">
          <p className="text-sm text-muted">{product.brand}</p>
          <h2 id="product-title" className="text-2xl leading-relaxed">
            {product.name}
          </h2>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm ${product.available ? "bg-[#edf4ed] text-[#365842]" : "bg-[#f3efef] text-[#765961]"}`}
          >
            {product.stock_status === "coming_soon"
              ? lang === "ar"
                ? "🔔 قريباً"
                : "Coming soon"
              : product.available
                ? t.available
                : lang === "ar"
                  ? "انتهى المخزون"
                  : "Out of stock"}
          </span>
          <ProductPrice product={product} lang={lang} />
          <p className="mt-5 leading-loose text-muted">{product.description[lang]}</p>
          {product.details && (
            <p dir="ltr" className="text-sm text-muted">
              {product.details.size}
            </p>
          )}
          <a
            href={whatsappLink(lang, product)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-center text-white"
          >
            <TbBrandWhatsapp size={22} />
            {product.available ? t.order : t.ask}
          </a>
          <ProductDetails product={product} lang={lang} />
          {product.id === "centella-duo" && (
            <div className="mt-8 space-y-3">
              {[
                [
                  cleansingCopy[lang].usageTitle,
                  cleansingCopy[lang].steps.map((s) => `${s.title}: ${s.text}`).join("\n\n"),
                ],
                [
                  cleansingCopy[lang].fullIngredients,
                  `Light Cleansing Oil\n${oilIngredients}\n\nAmpoule Foam\n${foamIngredients}`,
                ],
                ...cleansingCopy[lang].faqs,
              ].map(([title, body]) => (
                <details key={title} className="border-b border-line pb-3">
                  <summary className="cursor-pointer py-2 font-bold">{title}</summary>
                  <p className="mt-3 whitespace-pre-line text-sm leading-loose text-muted">
                    {body}
                  </p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
