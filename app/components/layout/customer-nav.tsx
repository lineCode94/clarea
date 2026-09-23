"use client";
import Image from "next/image";
export default function CustomerNav({ ar = true }: { ar?: boolean }) {
  return (
    <nav
      aria-label={ar ? "التنقل في المتجر" : "Store navigation"}
      dir={ar ? "rtl" : "ltr"}
      className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5d7cd] bg-white p-4 text-[#5C1A2B]"
    >
      <a href="/" aria-label="Claréa">
        <Image src="/clarea-logo-transparent.png" width={130} height={42} alt="Claréa" />
      </a>
      <div className="flex items-center gap-4 text-sm">
        <a href="/" className="py-3">
          {ar ? "الرئيسية" : "Home"}
        </a>
        <a href="/#collection" className="py-3">
          {ar ? "المنتجات" : "Products"}
        </a>
        <a href="/account" className="rounded-xl bg-[#F5E9E2] px-3 py-3 font-semibold">
          {ar ? "طلباتي" : "My orders"}
        </a>
      </div>
    </nav>
  );
}
