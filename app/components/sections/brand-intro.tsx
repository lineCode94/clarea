"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbArrowUpRight } from "react-icons/tb";
import type { Language } from "../../types/catalog";

type Slide = {
  id: string;
  image: string;
  alt: string;
  brand: string;
  position: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  label: Record<Language, string>;
};

const slides: Slide[] = [
  {
    id: "skin1004",
    brand: "SKIN1004",
    image: "/hero/skin1004-hero.jpg",
    alt: "SKIN1004 Madagascar Centella collection on linen with botanical leaves",
    position: "!object-cover !object-[center_45%]",
    title: { ar: "لمسة سنتيلا. لحظة هدوء.", en: "A little Centella. A moment of calm." },
    subtitle: {
      ar: "اكتشفي اختيارات SKIN1004 وأضيفي لمسة عناية لروتينك اليومي.",
      en: "Discover SKIN1004 and a thoughtful addition to your daily ritual.",
    },
    label: { ar: "تسوّقي مختاراتنا", en: "Shop the collection" },
  },
  {
    id: "anua",
    brand: "Anua",
    image: "/hero/anua-editorial.webp",
    alt: "Anua Retinol skincare collection with serum, cream and eye patch",
    position: "!object-cover !object-[center_40%]",
    title: { ar: "تفاصيل بسيطة. عناية تحبّينها.", en: "Simple details. Skincare to love." },
    subtitle: {
      ar: "تعرّفي على اختيارات Anua واختاري خطوتك القادمة في العناية.",
      en: "Meet our Anua edit and discover the next step in your skincare ritual.",
    },
    label: { ar: "تسوّقي مختاراتنا", en: "Discover our edit" },
  },
  {
    id: "medicube",
    brand: "medicube",
    image: "/hero/medicube-hero.jpg",
    alt: "Medicube skincare collection on marble with rose petals",
    position: "!object-cover !object-[center_45%]",
    title: { ar: "ترطيب يكمل روتينك.", en: "Hydration for your daily ritual." },
    subtitle: {
      ar: "اختيارات Medicube للعناية الكورية التي تحبّينها، في مكان واحد.",
      en: "Explore our Medicube edit and find your next Korean skincare favourite.",
    },
    label: { ar: "اكتشفي المنتجات", en: "Explore the collection" },
  },
];

const INTERVAL = 5500;

export default function BrandIntro({ lang }: { lang: Language }) {
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slide = slides[active % slides.length];

  /* Auto-advance */
  const next = useCallback(() => {
    setActive((c) => (c + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(next, INTERVAL);
    return () => clearInterval(timer);
  }, [active, next, reduced]);

  function previous() {
    setActive((c) => (c - 1 + slides.length) % slides.length);
  }

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label={ar ? "واجهة Claréa" : "Claréa highlights"}
      className="hero-banner max-sm:!h-[580px] max-sm:!min-h-[580px]"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          previous();
        }
      }}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const d = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(d) > 45) {
          d < 0 ? next() : previous();
        }
        touchStart.current = null;
      }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.8, ease: "easeInOut" }}
          className="hero-slide"
        >
          {/* Background image with Ken Burns zoom */}
          <motion.div
            initial={reduced ? false : { scale: 1.025 }}
            animate={{ scale: 1 }}
            transition={{ duration: 6, ease: "easeOut" }}
            className="hero-image-wrap bg-white"
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={active === 0}
              sizes="100vw"
              className={"hero-image " + slide.position}
            />
          </motion.div>

          {/* Dark gradient overlay */}
        </motion.div>
      </AnimatePresence>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(24,8,15,0.10)_0%,rgba(24,8,15,0.14)_30%,rgba(24,8,15,0.48)_62%,rgba(24,8,15,0.84)_100%)]"
      />
      {/* Content overlay – always on top */}
      <div className="hero-content max-sm:!px-6 max-sm:!py-6" dir={ar ? "rtl" : "ltr"}>
        {/* Center logo */}
        <Image
          src="/clarea-logo-transparent.png"
          alt="Claréa"
          width={280}
          height={93}
          className="hero-logo !absolute !top-4 !left-4 !w-[110px]"
          priority
        />

        {/* Bottom text + controls */}
        <div className="hero-bottom max-sm:!gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id + "-text"}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut" }}
              className="hero-text"
            >
              <p className="mb-3 text-sm font-semibold tracking-[0.22em] text-white/90" dir="ltr">
                {slide.brand}
              </p>
              <h1 className="hero-title !text-white max-sm:!text-[26px] max-sm:!leading-[1.3]">
                {slide.title[lang]}
              </h1>
              <p className="hero-subtitle !text-white max-sm:!text-[15px] max-sm:!leading-relaxed">
                {slide.subtitle[lang]}
              </p>
            </motion.div>
          </AnimatePresence>

          <a href="#collection" className="hero-cta">
            {slide.label[lang]}
            <TbArrowUpRight size={18} className="rtl:-scale-x-100" />
          </a>

          {/* Dots */}
          <div className="hero-dots" dir="ltr">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                aria-label={`${ar ? "الشريحة" : "Slide"} ${i + 1}`}
                aria-current={active === i ? "true" : undefined}
                className={`hero-dot ${active === i ? "hero-dot-active" : ""}`}
              >
                {active === i && (
                  <motion.span
                    className="hero-dot-fill"
                    layoutId="hero-dot-fill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
