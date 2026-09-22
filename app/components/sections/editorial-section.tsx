"use client";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";
import Image from "next/image";
import { TbArrowUpRight } from "react-icons/tb";
import { useProducts } from "../catalog-provider";
import type { Product } from "../../types/catalog";
export default function EditorialSection({
  lang,
  onSelect,
}: {
  lang: Language;
  onSelect: (product: Product) => void;
}) {
  const products = useProducts();
  const duo = products.find((product) => product.id === "centella-duo");
  const t = text[lang];
  const travelKit = products.find((product) => product.id === "travel-kit")!;
  if (!travelKit || !duo) return null;
  return (
    <section id="edit" className="border-y border-line bg-[#f4f6f4] py-12 md:py-16">
      <div className="page-width">
        <p className="text-sm text-deep-gold">{t.journal}</p>
        <h2 className="text-2xl md:text-3xl">{t.journalCopy}</h2>
        <div className="grid gap-7 md:grid-cols-[1.2fr_1fr]">
          <button onClick={() => onSelect(duo)} className="group text-start">
            <div className="aspect-[1.5] overflow-hidden rounded-lg">
              <Image
                src="/centella-editorial-gold.webp"
                alt="SKIN1004 Centella Cleansing Duo"
                width={1536}
                height={1024}
                className="size-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="mb-1 text-xl">{t.studio}</h3>
                <p className="mb-0 text-sm text-muted">{t.studioCopy}</p>
              </div>
              <TbArrowUpRight size={26} className="rtl:-scale-x-100" />
            </div>
          </button>
          <button onClick={() => onSelect(travelKit)} className="group text-start">
            <div className="aspect-[1.5] overflow-hidden rounded-lg bg-[#e8f2ef]">
              <Image
                src={travelKit.images[1] || travelKit.images[0]}
                alt={travelKit.name}
                width={900}
                height={900}
                className="size-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="mb-1 text-xl">
                  {lang === "ar" ? "عناية ترافقك" : "Care to take with you"}
                </h3>
                <p className="mb-0 text-sm text-muted">{travelKit.label[lang]}</p>
              </div>
              <TbArrowUpRight size={26} className="rtl:-scale-x-100" />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
