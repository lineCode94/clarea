"use client";

import Image from "next/image";
import { CartButton } from "../cart/cart-panel";
import { TbWorld, TbSearch, TbGift, TbX } from "react-icons/tb";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { text } from "../../content/catalog";
import { rewardsText } from "../../content/rewards";
import type { Language } from "../../types/catalog";

type Props = {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onCategoryChange: (category: string) => void;
  onOpenGifts: () => void;
};

/* ── animation variants ── */
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
};

const panelVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: "0%",
    transition: { type: "spring", damping: 30, stiffness: 300, mass: 0.8 },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
  exit: {},
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", damping: 24, stiffness: 260 },
  },
  exit: { opacity: 0, x: 20, transition: { duration: 0.12 } },
};

const dividerVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function SiteHeader({
  lang,
  onLanguageChange,
  onCategoryChange,
  onOpenGifts,
}: Props) {
  const t = text[lang];
  const r = rewardsText[lang];
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Lock body scroll when menu is open */
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function search() {
    const input = document.querySelector<HTMLInputElement>('#collection input[type="search"]');
    input?.scrollIntoView({ block: "center", behavior: "instant" });
    input?.focus({ preventScroll: true });
  }

  const handleNav = useCallback(
    (category: string) => {
      setMenuOpen(false);
      /* Small delay so the menu starts closing before scroll */
      setTimeout(() => onCategoryChange(category), 120);
    },
    [onCategoryChange],
  );

  const navItems: { key: string; label: string; category?: string; href?: string }[] = [
    { key: "all", label: t.all, category: "all" },
    { key: "skin", label: t.skin, category: "skin" },
    { key: "hair", label: t.hair, category: "hair" },
    { key: "supplements", label: t.supplements, category: "supplements" },
    { key: "oral", label: t.oral, category: "oral" },
    { key: "about", label: ar ? "عن Claréa" : "About Claréa", href: "#about" },
  ];

  return (
    <>
      <div className="bg-brand px-4 py-2 text-center text-xs leading-relaxed text-white sm:text-sm">
        {ar ? "فوق ٤٬٠٠٠ جنيه: شحن وبوكس مجانًا" : "Over EGP 4,000: free shipping & box"}
      </div>
      <header className="topbar sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
        <div className="page-width grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4 md:py-6">
          {/* Left: language + hamburger on mobile */}
          <div className="flex items-center gap-1">
            <a
              href="/account"
              className="flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold text-brand"
            >
              {ar ? "طلباتي" : "My orders"}
            </a>
            <button
              onClick={() => onLanguageChange(ar ? "en" : "ar")}
              title={ar ? "English" : "العربية"}
              aria-label={ar ? "English" : "العربية"}
              className="language-button flex min-h-11 w-fit items-center gap-2 text-sm"
            >
              <TbWorld size={22} />
              <span className="hidden sm:inline">{ar ? "English" : "العربية"}</span>
            </button>
          </div>

          {/* Center: logo */}
          <a href="#top" aria-label="Claréa">
            <Image
              src="/clarea-logo-transparent.png"
              alt="Claréa"
              width={210}
              height={65}
              className="h-auto w-[138px] sm:w-[210px]"
              priority
            />
          </a>

          {/* Right: search, gifts, hamburger */}
          <div className="flex items-center justify-end gap-0 sm:gap-2">
            <button
              onClick={search}
              title={r.search}
              aria-label={r.search}
              className="hidden size-10 place-items-center rounded-full hover:bg-brand/5 sm:grid sm:size-11"
            >
              <TbSearch size={23} />
            </button>
            <button
              onClick={onOpenGifts}
              title={r.gifts}
              aria-label={r.gifts}
              className="hidden size-10 place-items-center rounded-full text-brand hover:bg-brand/5 sm:grid sm:size-11"
            >
              <TbGift size={24} />
            </button>
            <CartButton lang={lang} />
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label={ar ? "القائمة" : "Menu"}
              className="mobile-menu-btn grid size-10 place-items-center rounded-full hover:bg-brand/5 md:hidden"
            >
              <span className="flex flex-col items-center justify-center gap-[5px]">
                <span className="block h-[2px] w-[20px] rounded-full bg-foreground transition-transform" />
                <span className="block h-[2px] w-[20px] rounded-full bg-foreground transition-transform" />
                <span className="block h-[2px] w-[14px] rounded-full bg-foreground transition-transform self-end" />
              </span>
            </button>
          </div>
        </div>

        {/* Desktop nav — hidden on mobile */}
        <nav
          aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
          className="hidden border-t border-line/60 md:block"
        >
          <div className="page-width flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-sm sm:gap-x-9">
            <button
              className="min-h-10 font-bold text-brand"
              onClick={() => onCategoryChange("all")}
            >
              {t.all}
            </button>
            <button className="min-h-10 hover:text-brand" onClick={() => onCategoryChange("skin")}>
              {t.skin}
            </button>
            {(["hair", "supplements", "oral"] as const).map((category) => (
              <button
                key={category}
                className="min-h-10 hover:text-brand"
                onClick={() => onCategoryChange(category)}
              >
                {t[category]}
              </button>
            ))}
            <a className="inline-flex min-h-10 items-center hover:text-brand" href="#about">
              {ar ? "عن Claréa" : "About Claréa"}
            </a>
          </div>
        </nav>
      </header>

      {/* ── Mobile Menu Overlay ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-menu-backdrop"
              variants={reduced ? undefined : backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              key="mobile-menu-panel"
              variants={reduced ? undefined : panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              dir={ar ? "rtl" : "ltr"}
              className="fixed inset-y-0 right-0 z-50 flex w-[82vw] max-w-[340px] flex-col bg-white shadow-2xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={ar ? "القائمة" : "Menu"}
            >
              {/* Panel header */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 pb-4 pt-6">
                <div /> {/* Spacer for centering */}
                <Image
                  src="/clarea-logo-transparent.png"
                  alt="Claréa"
                  width={120}
                  height={40}
                  className="h-auto w-[100px] place-self-center"
                />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label={ar ? "إغلاق" : "Close"}
                  className="grid size-10 place-items-center place-self-end rounded-full hover:bg-brand/5"
                >
                  <TbX size={22} />
                </button>
              </div>

              {/* Divider */}
              <motion.div
                variants={reduced ? undefined : dividerVariants}
                className="mx-6 h-px origin-left bg-line"
              />

              {/* Nav items */}
              <motion.nav
                variants={reduced ? undefined : listVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 overflow-y-auto px-6 py-6"
                aria-label={ar ? "القائمة" : "Navigation"}
              >
                <ul className="flex flex-col">
                  {navItems.map((item) => (
                    <motion.li key={item.key} variants={reduced ? undefined : itemVariants}>
                      {item.href ? (
                        <a
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="mobile-nav-link block w-full border-b border-line/50 py-4.5 text-center text-[17px] font-medium text-foreground transition-colors hover:text-brand"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <button
                          onClick={() => handleNav(item.category!)}
                          className="mobile-nav-link block w-full border-b border-line/50 py-4.5 text-center text-[17px] font-medium text-foreground transition-colors hover:text-brand"
                        >
                          {item.label}
                        </button>
                      )}
                    </motion.li>
                  ))}
                </ul>
              </motion.nav>

              {/* Bottom actions */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="border-t border-line/60 px-6 py-5"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      search();
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand/5 py-3 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
                  >
                    <TbSearch size={18} />
                    {r.search}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGifts();
                    }}
                    className="grid size-12 place-items-center rounded-xl bg-brand text-white transition-colors hover:bg-brand/90"
                    aria-label={r.gifts}
                  >
                    <TbGift size={22} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    onLanguageChange(ar ? "en" : "ar");
                    setMenuOpen(false);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  <TbWorld size={18} />
                  {ar ? "Switch to English" : "التبديل للعربية"}
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
