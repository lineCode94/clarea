"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbArrowUpRight } from "react-icons/tb";
import type { Language } from "../../types/catalog";
import styles from "./brand-intro.module.css";

type Slide = {
  id: string;
  eyebrow: Record<Language, string>;
  title: Record<Language, string>;
  description: Record<Language, string>;
  label: Record<Language, string>;
  images: string[];
};

const slides: Slide[] = [
  {
    id: "brand",
    eyebrow: { ar: "اكتشفي العناية الكورية", en: "EXPLORE KOREAN SKINCARE" },
    title: { ar: "روتين العناية يبدأ هنا.", en: "Your skincare ritual starts here." },
    description: {
      ar: "اكتشفي منتجات العناية الكورية من Claréa، من التنظيف إلى الترطيب والحماية من الشمس.",
      en: "Discover Korean skincare at Claréa, from daily cleansing to hydration and sun protection.",
    },
    label: { ar: "تسوّقي العناية بالبشرة", en: "Shop skincare" },
    images: ["/products/centella-ampoule.png", "/products/poremizing-toner.png", "/products/sun-stick.png"],
  },
  {
    id: "ritual",
    eyebrow: { ar: "خطوات العناية اليومية", en: "EVERYDAY SKINCARE" },
    title: { ar: "كل خطوة لها عنايتها.", en: "Find your next skincare step." },
    description: {
      ar: "تعرّفي على استخدام كل منتج ومكوناته، واختاري ما يكمّل روتينك اليومي.",
      en: "Explore how each product works and what it contains, then choose what fits your daily routine.",
    },
    label: { ar: "تصفّحي المنتجات", en: "Browse products" },
    images: ["/products/centella-ampoule.png", "/products/air-fit-light.png", "/products/sun-stick.png"],
  },
  {
    id: "edit",
    eyebrow: { ar: "تعرّفي على SKIN1004", en: "DISCOVER SKIN1004" },
    title: { ar: "اكتشفي عناية سنتيلا.", en: "Meet your Centella essentials." },
    description: {
      ar: "استكشفي اختيارات SKIN1004 من الأمبول والتونر وواقي الشمس، مع تفاصيل تساعدك على الاختيار.",
      en: "Explore SKIN1004 ampoules, toners and sunscreens, with clear product details to help you choose.",
    },
    label: { ar: "اكتشفي المنتجات", en: "Explore products" },
    images: ["/products/poremizing-toner.png", "/products/centella-ampoule.png", "/products/air-fit-light.png"],
  },
];

export default function BrandIntro({ lang }: { lang: Language }) {
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slide = slides[active];



  function previous() {
    setActive((current) => (current - 1 + slides.length) % slides.length);
  }

  function next() {
    setActive((current) => (current + 1) % slides.length);
  }

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label={ar ? "واجهة Claréa" : "Claréa highlights"}
      className={styles.hero}
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); next(); } if (event.key === "ArrowLeft") { event.preventDefault(); previous(); } }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) { if (distance < 0) next(); else previous(); } touchStart.current = null; }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, clipPath: reduced ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 0% 100%)" }}
          animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`${styles.slide} ${styles[slide.id]}`}
        >
          <div className={styles.stage} aria-hidden="true">
            <Image src="/clarea-logo-transparent.png" alt="" width={2172} height={724} sizes="(max-width: 767px) 88vw, 44vw" className={styles.stageLogo} />
            <div className={styles.pedestal} />
            {slide.images.map((src, index) => (
              <motion.div
                key={src}
                initial={reduced ? false : { opacity: 0, scale: 0.86, x: index === 1 ? 80 : -50, y: 45, rotate: index === 1 ? 12 : -12 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -22 }}
                transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`${styles.product} ${styles[`product${index + 1}`]}`}
              >
                <Image src={src} alt="" fill sizes="(max-width: 767px) 40vw, 340px" className={styles.productImage} priority={active === 0 && index < 2} />
              </motion.div>
            ))}
          </div>

          <div className={styles.inner} dir={ar ? "rtl" : "ltr"}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 36, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={styles.copy}
            >
              <p className={styles.eyebrow}>{slide.eyebrow[lang]}</p>
              <span className={styles.edition}>{ar ? "CLARÉA / العناية بالبشرة" : "CLARÉA / SKINCARE"}</span>
              <h1 className={styles.title}>{slide.title[lang]}</h1>
              <p className={styles.description}>{slide.description[lang]}</p>
              <a href="#collection" className={styles.cta}>
                {slide.label[lang]}
                <TbArrowUpRight size={20} className="rtl:-scale-x-100" />
              </a>
      <div className={styles.controls} dir="ltr">
        <button onClick={previous} aria-label={ar ? "الشريحة السابقة" : "Previous slide"} className={styles.arrow}>
          <TbArrowLeft size={20} />
        </button>
        <div className={styles.pagination}>
          {slides.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActive(index)}
              aria-label={`${ar ? "الشريحة" : "Slide"} ${index + 1}`}
              aria-current={active === index ? "true" : undefined}
              className={`${styles.dot} ${active === index ? styles.dotActive : ""}`}
            >
              {active === index && <span className={styles.progress} />}
            </button>
          ))}
        </div>
        <button onClick={next} aria-label={ar ? "الشريحة التالية" : "Next slide"} className={styles.arrow}>
          <TbArrowRight size={20} />
        </button>
      </div>

            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

    </section>
  );
}




