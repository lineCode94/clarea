"use client";

import Image from "next/image";
import { TbWorld, TbSearch, TbGift } from "react-icons/tb";
import { text } from "../../content/catalog";
import { rewardsText } from "../../content/rewards";
import type { Language } from "../../types/catalog";

type Props = {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onCategoryChange: (category: string) => void;
  onOpenGifts: () => void;
};

export default function SiteHeader({
  lang,
  onLanguageChange,
  onCategoryChange,
  onOpenGifts,
}: Props) {
  const t = text[lang];
  const r = rewardsText[lang];
  function search() {
    const input = document.querySelector<HTMLInputElement>('#collection input[type="search"]');
    input?.scrollIntoView({ block: "center", behavior: "instant" });
    input?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className="bg-brand px-4 py-2 text-center text-xs leading-relaxed text-white sm:text-sm">
        {lang === "ar"
          ? "فوق ٤٬٠٠٠ جنيه: شحن وبوكس مجانًا"
          : "Over EGP 4,000: free shipping & box"}
      </div>
      <header className="topbar sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
        <div className="page-width grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4 md:py-6">
          <button
            onClick={() => onLanguageChange(lang === "ar" ? "en" : "ar")}
            title={lang === "ar" ? "English" : "العربية"}
            aria-label={lang === "ar" ? "English" : "العربية"}
            className="language-button flex min-h-11 w-fit items-center gap-2 text-sm"
          >
            <TbWorld size={22} />
            <span className="hidden sm:inline">{lang === "ar" ? "English" : "العربية"}</span>
          </button>
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
          <div className="flex items-center justify-end gap-0 sm:gap-2">
            <button
              onClick={search}
              title={r.search}
              aria-label={r.search}
              className="grid size-10 place-items-center rounded-full hover:bg-brand/5 sm:size-11"
            >
              <TbSearch size={23} />
            </button>
            <button
              onClick={onOpenGifts}
              title={r.gifts}
              aria-label={r.gifts}
              className="grid size-10 place-items-center rounded-full text-brand hover:bg-brand/5 sm:size-11"
            >
              <TbGift size={24} />
            </button>
          </div>
        </div>
        <nav
          aria-label={lang === "ar" ? "القائمة الرئيسية" : "Main navigation"}
          className="border-t border-line/60"
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
            {(["hair", "supplements", "oral", "drinks"] as const).map((category) => (
              <button key={category} className="min-h-10 hover:text-brand" onClick={() => onCategoryChange(category)}>{t[category]}</button>
            ))}
            <a className="inline-flex min-h-10 items-center hover:text-brand" href="#about">
              {lang === "ar" ? "عن Claréa" : "About Claréa"}
            </a>
          </div>
        </nav>
      </header>
    </>
  );
}
