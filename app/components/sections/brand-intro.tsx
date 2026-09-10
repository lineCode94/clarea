"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbArrowUpRight } from "react-icons/tb";
import type { Language } from "../../types/catalog";

type Slide = {
  id: string;
  image: string;
  tint: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  label: Record<Language, string>;
};

const slides: Slide[] = [
  {
    id: "hero-1",
    image: "/clarea-campaign-hero.png",
    tint: "rgba(84,28,43,0.38)",
    title: { ar: "روتين العناية يبدأ هنا", en: "Your skincare ritual starts here" },
    subtitle: {
      ar: "اكتشفي منتجات العناية الكورية من Claréa",
      en: "Discover Korean skincare at Claréa",
    },
    label: { ar: "تسوّقي الآن", en: "Shop now" },
  },
  {
    id: "hero-2",
    image: "/hero/centella-ampoule.jpg",
    tint: "rgba(84,28,43,0.35)",
    title: { ar: "ترطيب خفيف. راحة لبشرتك.", en: "A little hydration. A softer feel." },
    subtitle: {
      ar: "أمبول سنتيلا من SKIN1004: ترطيب بقوام خفيف ولمسة تهدئة لروتينك اليومي.",
      en: "Meet the SKIN1004 Centella Ampoule: lightweight hydration and soothing care for your daily routine.",
    },
    label: { ar: "اكتشفي أمبول سنتيلا", en: "Discover Centella" },
  },
  {
    id: "hero-3",
    image: "/hero/poremizing-toner.png",
    tint: "rgba(84,28,43,0.32)",
    title: { ar: "خطوتك لملمس أنعم", en: "Make room for smoother skin." },
    subtitle: {
      ar: "تونر Poremizing المقشّر يساعد على إزالة الخلايا الميتة والشوائب السطحية لملمس أكثر نعومة.",
      en: "Refresh your routine with Poremizing Clear Toner, an exfoliating step for smoother-feeling skin.",
    },
    label: { ar: "اكتشفي التونر", en: "Explore the toner" },
  },
];

const INTERVAL = 5500;

export default function BrandIntro({ lang }: { lang: Language }) {
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slide = slides[active];

  /* Auto-advance */
  const next = useCallback(() => {
    setActive((c) => (c + 1) % slides.length);
  }, []);

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
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); previous(); }
      }}
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const d = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(d) > 45) { d < 0 ? next() : previous(); }
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
            className="hero-image-wrap bg-[#f5e9e2]"
          >
            <Image
              src={slide.image}
              alt=""
              fill
              priority={active === 0}
              sizes="100vw"
              className={slide.id === "hero-1" ? "hero-image !object-cover !object-[75%_center] md:!object-center" : "hero-image !object-cover !object-[center_45%]"}
            />
          </motion.div>

          {/* Dark gradient overlay */}
        </motion.div>
      </AnimatePresence>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(24,8,15,0.32)_0%,rgba(24,8,15,0.38)_30%,rgba(24,8,15,0.72)_55%,rgba(24,8,15,0.90)_100%)]" />
      {/* Content overlay – always on top */}
      <div className="hero-content max-sm:!px-6 max-sm:!py-6" dir={ar ? "rtl" : "ltr"}>
        {/* Center logo */}
        <Image
          src="/clarea-logo-transparent.png"
          alt="Claréa"
          width={280}
          height={93}
          className="hero-logo"
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
              <h1 className="hero-title !text-white max-sm:!text-[26px] max-sm:!leading-[1.3]">{slide.title[lang]}</h1>
              <p className="hero-subtitle !text-white max-sm:!text-[15px] max-sm:!leading-relaxed">{slide.subtitle[lang]}</p>
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


