"use client";
import Image from "next/image";
import { useCart } from "../cart/cart-provider";
import ProductPrice from "./product-price";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbX, TbBrandWhatsapp, TbZoomIn, TbMaximize } from "react-icons/tb";
import type { Product, Language } from "../../types/catalog";
import { whatsappLink } from "../../lib/whatsapp";
import { text } from "../../content/catalog";
import { cleansingCopy, oilIngredients, foamIngredients } from "../../data/cleansing";
import ProductDetails from "./product-details";

function MagnifierImage({
  src,
  alt,
  lang,
  imageTransform,
}: {
  src: string;
  alt: string;
  lang: Language;
  imageTransform?: string;
}) {
  const [zoom, setZoom] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setPosition({ x, y });
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setFullscreen(true)}
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-white select-none shadow-sm"
        title={lang === "ar" ? "اضغطي لتكبير الصورة بالكامل" : "Click to view full image"}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 450px"
          className="object-contain p-2"
          style={{ transform: imageTransform }}
        />

        {/* Floating Zoom Indicator Badge */}
        <div className="absolute bottom-3 end-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all group-hover:bg-[#5C1A2B] group-hover:scale-105">
          <TbZoomIn size={16} />
          <span>{lang === "ar" ? "عدسة المكبرة" : "Hover / Click to zoom"}</span>
        </div>

        {/* Hover Magnifying Lens Circular Window */}
        {zoom && (
          <div
            className="pointer-events-none absolute size-48 rounded-full border-2 border-white shadow-2xl overflow-hidden bg-white z-20 hidden md:block"
            style={{
              top: `${position.y}%`,
              left: `${position.x}%`,
              transform: "translate(-50%, -50%)",
              backgroundImage: `url(${src})`,
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundSize: "280%",
              backgroundRepeat: "no-repeat",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.8)",
            }}
          />
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all"
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 end-4 z-50 grid size-12 place-items-center rounded-full bg-white/20 text-white hover:bg-white/40 shadow-lg"
            aria-label="Close zoom view"
          >
            <TbX size={26} />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative h-[85vh] w-[90vw] max-w-4xl overflow-hidden rounded-2xl bg-white/10 p-2 border border-white/20 shadow-2xl"
          >
            <Image src={src} alt={alt} fill className="object-contain p-4" priority />
          </div>
        </div>
      )}
    </>
  );
}

export default function ProductDialog({
  product,
  lang,
  close,
}: {
  product: Product;
  lang: Language;
  close: () => void;
}) {
  const cart = useCart();
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
                <MagnifierImage
                  src={product.images[index]}
                  alt={product.name}
                  lang={lang}
                  imageTransform={index === 0 ? product.imageTransform : undefined}
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
          {product.available && product.public_price != null && (
            <button
              type="button"
              disabled={!cart.ready}
              onClick={() => {
                close();
                cart.add(product);
              }}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-brand px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {lang === "ar" ? "أضيفي للسلة" : "Add to bag"}
            </button>
          )}
          <a
            href={whatsappLink(lang, product)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-center text-brand"
          >
            <TbBrandWhatsapp size={22} />
            {lang === "ar" ? "اسألي على واتساب" : "Ask on WhatsApp"}
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
