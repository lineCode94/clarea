"use client";

import Image from "next/image";
import { TbArrowUpRight, TbBrandWhatsapp, TbGift, TbPackage, TbListDetails } from "react-icons/tb";
import { useProducts } from "../catalog-provider";
import { homeCategories, homeCollections } from "../../config/home-collections";
import type { Language, Product } from "../../types/catalog";
import ProductShelf from "./product-shelf";

type Props = {
  lang: Language;
  onSelect: (product: Product) => void;
  onExplore: (category: string, query?: string) => void;
};

export function ShopCategories({ lang, onExplore }: Pick<Props, "lang" | "onExplore">) {
  return (
    <section
      className="page-width py-12 md:py-16"
      aria-label={lang === "ar" ? "تسوقي حسب الفئة" : "Shop by category"}
    >
      <h2 className="mb-7 text-2xl text-brand md:text-3xl">
        {lang === "ar" ? "تسوقي حسب الفئة" : "Shop by category"}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {homeCategories.map((category) => (
          <button
            key={category.en}
            onClick={() => onExplore(category.id, category.query)}
            className="group text-start"
          >
            <div
              className="relative mb-3 aspect-[1.15] overflow-hidden rounded-lg"
              style={{ background: category.tone }}
            >
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(max-width: 767px) 45vw, 280px"
                className="object-contain p-5 mix-blend-multiply transition-transform duration-500 motion-safe:group-hover:scale-105"
              />
            </div>
            <span className="flex items-center justify-between gap-2 text-sm font-bold md:text-base">
              {category[lang]}
              <TbArrowUpRight size={20} className="rtl:-scale-x-100" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomeSections({ lang, onSelect, onExplore }: Props) {
  const products = useProducts();
  const selectProducts = (ids: string[]) =>
    ids.flatMap((id) => products.filter((p) => p.id === id));
  const ar = lang === "ar";
  const duo = products.find((product) => product.id === "centella-duo");
  return (
    <>
      <ProductShelf
        lang={lang}
        title={ar ? "الجديد في Claréa" : "New to Claréa"}
        subtitle={
          ar
            ? "اكتشفي المزيد للعناية ببشرتك وشعرك"
            : "Discover more for your skin, hair and daily care"
        }
        products={products.filter((product) => product.newArrival)}
        onSelect={onSelect}
        onViewAll={() => onExplore("all")}
      />
      <ProductShelf
        lang={lang}
        title={ar ? "اختيارات Claréa" : "Claréa picks"}
        subtitle={
          ar
            ? "اختيارات للتنظيف والترطيب والعناية اليومية"
            : "Explore cleansing, hydration and everyday care"
        }
        products={selectProducts(homeCollections.care)}
        onSelect={onSelect}
        onViewAll={() => onExplore("all")}
      />
      {duo && (
        <section
          className="relative isolate flex min-h-[620px] items-start overflow-hidden bg-[#e5f1ed] md:min-h-[480px] md:items-center"
          aria-label={ar ? "روتين التنظيف" : "The cleansing ritual"}
        >
          <Image
            src="/clarea-campaign-hero.png"
            alt={duo.name}
            fill
            sizes="100vw"
            className="object-cover object-[85%_center] max-md:!top-auto max-md:!h-[45%] md:object-center"
          />
          <div className="page-width relative z-10 py-10 md:py-0" dir="ltr">
            <div className="max-w-[420px] md:w-[42%]" dir={ar ? "rtl" : "ltr"}>
              <p className="text-sm font-bold text-deep-gold">SKIN1004 · CENTELLA</p>
              <h2 className="text-3xl text-brand md:text-4xl">
                {ar ? "ابدئي روتينك بالتنظيف." : "A fresh start for your routine."}
              </h2>
              <p className="text-base text-[#334d47]">
                {ar
                  ? "اكتشفي ثنائي التنظيف: زيت تنظيف وغسول فوم، في مجموعة واحدة."
                  : "Discover the cleansing duo: an oil cleanser and a foam cleanser, together in one set."}
              </p>
              <button
                onClick={() => onSelect(duo)}
                className="mt-2 inline-flex min-h-12 items-center gap-5 rounded bg-brand px-6 py-3 text-sm font-bold text-white"
              >
                {ar ? "اكتشفي الثنائي" : "Explore the duo"}
                <TbArrowUpRight size={22} className="rtl:-scale-x-100" />
              </button>
            </div>
          </div>
        </section>
      )}
      <ProductShelf
        lang={lang}
        title={ar ? "عالم SKIN1004" : "The world of SKIN1004"}
        subtitle={
          ar
            ? "من الأمبول إلى واقي الشمس، اكتشفي خطوتك التالية"
            : "From ampoules to sun protection, find your next step"
        }
        products={selectProducts(homeCollections.skin1004)}
        onSelect={onSelect}
        onViewAll={() => onExplore("skin", "SKIN1004")}
      />
      <section
        className="page-width py-12 text-center md:py-16"
        aria-label={ar ? "الماركات" : "Brands"}
      >
        <h2 className="mb-8 text-2xl text-brand">
          {ar ? "تسوّقي حسب العلامة التجارية" : "Shop by brand"}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-24">
          {Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).map(
            (brand) => (
              <button
                key={brand}
                onClick={() => onExplore("all", brand)}
                className="py-3 font-serif text-3xl text-[#334d47] transition-colors hover:text-brand md:text-4xl"
              >
                {brand}
              </button>
            ),
          )}
        </div>
      </section>
      <section
        className="border-y border-line bg-[#faf8f9] py-8"
        aria-label={ar ? "مع Claréa" : "With Claréa"}
      >
        <div className="page-width grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            {
              Icon: TbBrandWhatsapp,
              title: ar ? "تواصل مباشر" : "Talk to us",
              copy: ar ? "اسألي فريقنا على واتساب" : "Talk to our team on WhatsApp",
            },
            {
              Icon: TbListDetails,
              title: ar ? "تفاصيل واضحة" : "Clear details",
              copy: ar ? "تعرّفي على المنتج قبل طلبه" : "Explore each product before ordering",
            },
            {
              Icon: TbPackage,
              title: ar ? "تأكيد التوفر" : "Stock confirmation",
              copy: ar ? "نؤكد تفاصيل طلبك معكِ" : "Confirm your order with our team",
            },
            {
              Icon: TbGift,
              title: ar ? "هدايا Claréa" : "Claréa gifts",
              copy: ar
                ? "جرّبي عجلة الهدايا واطّلعي على الشروط"
                : "Try the gift wheel and view the offer terms",
            },
          ].map(({ Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon size={27} className="shrink-0 text-brand" />
              <div>
                <h3 className="mb-1 text-sm">{title}</h3>
                <p className="mb-0 text-xs leading-relaxed text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
