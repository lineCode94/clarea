"use client";
import Image from "next/image";
import type { Language } from "../../types/catalog";
import { TbWorld } from "react-icons/tb";

type Props = {
  lang?: Language;
  onLangChange?: (lang: Language) => void;
};

export default function CustomerNav({ lang = "ar", onLangChange }: Props) {
  const ar = lang === "ar";
  return (
    <nav
      aria-label={ar ? "التنقل في المتجر" : "Store navigation"}
      dir={ar ? "rtl" : "ltr"}
      className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5d7cd] bg-white p-4 text-[#5C1A2B]"
    >
      <a href="/" aria-label="Claréa">
        <Image src="/clarea-logo-transparent.png" width={130} height={42} alt="Claréa" />
      </a>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <a href="/" className="py-3 font-semibold hover:opacity-80">
          {ar ? "الرئيسية" : "Home"}
        </a>
        <a href="/#collection" className="py-3 font-semibold hover:opacity-80">
          {ar ? "المنتجات" : "Products"}
        </a>
        <a href="/account" className="rounded-xl bg-[#F5E9E2] px-4 py-2 font-bold hover:bg-[#ebd5c8]">
          {ar ? "طلباتي" : "My orders"}
        </a>
        {onLangChange && (
          <button
            onClick={() => onLangChange(ar ? "en" : "ar")}
            className="flex items-center gap-1.5 rounded-lg border border-[#e5d7cd] px-3 py-2 text-xs font-semibold text-muted hover:bg-gray-50"
          >
            <TbWorld size={16} />
            {ar ? "English" : "العربية"}
          </button>
        )}
      </div>
    </nav>
  );
}
