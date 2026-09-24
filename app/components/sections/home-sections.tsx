"use client";

import Image from "next/image";
import { TbArrowUpRight, TbBrandWhatsapp, TbGift, TbPackage, TbListDetails } from "react-icons/tb";
import { useProducts } from "../catalog-provider";
import { homeCategories, homeCollections, popularProductIds } from "../../config/home-collections";
import type { Language, Product } from "../../types/catalog";
import BrandStrip from "./brand-strip";
import ProductShelf from "./product-shelf";

type Props = {
  lang: Language;
  onSelect: (product: Product) => void;
  onExplore: (category: string, query?: string, sort?: string) => void;
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 md:gap-6">
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
  const storeBestsellers = products
    .filter((p) => p.best_seller_rank !== undefined)
    .sort((a, b) => a.best_seller_rank! - b.best_seller_rank!)
    .slice(0, 4);
  // Reserve space for both store sales and curated popular products, without duplicates.
  const bestSellers = Array.from(
    new Map(
      [...storeBestsellers, ...selectProducts(popularProductIds)].map((p) => [p.id, p]),
    ).values(),
  );
  const highlights = ["skin", "hair", "oral", "supplements"].flatMap((category) => {
    const product =
      products.find((p) => p.category === category && p.available) ||
      products.find((p) => p.category === category);
    return product ? [product] : [];
  });
  return (
    <>
      <div id="new-arrivals" className="scroll-mt-24">
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
      </div>
      {bestSellers.length > 0 && (
        <ProductShelf
          lang={lang}
          title={ar ? "الأكثر مبيعًا" : "Bestsellers"}
          subtitle={
            ar
              ? "منتجات رائجة ومفضّلة لدى عملاء Claréa"
              : "Popular favourites and customer picks at Claréa"
          }
          products={bestSellers}
          onSelect={onSelect}
          onViewAll={() => onExplore("all", "", "best-selling")}
        />
      )}
      <section
        className="overflow-hidden border-y border-line bg-[#f5e9e2]"
        aria-label={ar ? "عالم العناية في Claréa" : "Your world of care"}
      >
        <div className="page-width grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-deep-gold">THE WORLD OF CLARÉA</p>
            <h2 className="max-w-lg text-3xl leading-tight text-brand md:text-5xl">
              {ar
                ? "كل ما تحبينه للعناية بنفسك، في مكان واحد."
                : "Your care. Your choices. All in one place."}
            </h2>
            <p className="max-w-lg text-base leading-8 text-muted">
              {ar
                ? "من العناية بالبشرة والشعر إلى تفاصيل روتينك اليومي، اكتشفي منتجات وماركات متنوعة واختاري ما يناسبك."
                : "From skincare and haircare to your everyday essentials, explore a variety of products and brands and find your favourites."}
            </p>
            <button
              onClick={() => onExplore("all")}
              className="mt-3 inline-flex min-h-12 items-center gap-5 rounded-full bg-brand px-7 py-3 text-sm font-bold text-white"
            >
              {ar ? "تصفّحي كل المنتجات" : "Explore all products"}
              <TbArrowUpRight size={22} className="rtl:-scale-x-100" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {highlights.map((product, i) => (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                className={
                  "group min-w-0 rounded-2xl bg-white/75 p-4 text-start shadow-sm " +
                  (i % 2 ? "translate-y-3" : "")
                }
              >
                <div className="relative aspect-square">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width:767px) 40vw, 240px"
                    className="object-contain p-2 transition-transform duration-500 motion-safe:group-hover:scale-105"
                  />
                </div>
                <p className="mb-1 mt-3 text-xs font-bold text-brand">{product.brand}</p>
                <p className="m-0 line-clamp-2 text-xs leading-5 text-muted">{product.name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
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
        <BrandStrip
          ar={ar}
          onExplore={onExplore}
          brands={Array.from(new Set(products.map((p) => p.brand).filter(Boolean)))}
        />
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
