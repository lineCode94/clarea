"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { text } from "../content/catalog";
import { useCatalogFilters } from "../hooks/use-catalog-filters";
import { whatsappLink } from "../lib/whatsapp";
import type { Language, Product } from "../types/catalog";
import SiteHeader from "./layout/site-header";
import SiteFooter from "./layout/site-footer";
import BrandIntro from "./sections/brand-intro";
import BeautyCursor from "./layout/beauty-cursor";
import HomeSections, { ShopCategories } from "./sections/home-sections";
import EditorialSection from "./sections/editorial-section";
import AboutSection from "./sections/about-section";
import FaqSection from "./sections/faq-section";
import ProductCatalog from "./catalog/product-catalog";
import ProductDialog from "./catalog/product-dialog";
import StorefrontActions from "./rewards/storefront-actions";

export default function CatalogPage() {
  const [lang, setLang] = useState<Language>("ar");
  const [selected, setSelected] = useState<Product | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const filters = useCatalogFilters(lang);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function exploreCategory(category: string, query = "") {
    filters.reset();
    filters.setCategory(category);
    filters.setQuery(query);
    document.getElementById("collection")?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <main
        lang={lang}
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={`min-h-screen ${lang === "ar" ? "font-arabic" : "font-sans"}`}
      >
        <BeautyCursor />
        <SiteHeader
          lang={lang}
          onLanguageChange={setLang}
          onCategoryChange={exploreCategory}
          onOpenGifts={() => setGiftsOpen(true)}
        />
        <BrandIntro lang={lang} />
        <ShopCategories lang={lang} onExplore={exploreCategory} />
        <HomeSections lang={lang} onSelect={setSelected} onExplore={exploreCategory} />
        <ProductCatalog lang={lang} filters={filters} onSelect={setSelected} />
        <EditorialSection
          lang={lang}
          onSelect={setSelected}
        />
        <AboutSection lang={lang} />
        <FaqSection lang={lang} />
        <SiteFooter lang={lang} whatsappUrl={whatsappLink(lang)} note={text[lang].footer} />
        <StorefrontActions
          lang={lang}
          open={giftsOpen}
          onOpen={() => setGiftsOpen(true)}
          onClose={() => setGiftsOpen(false)}
        />
        {selected && (
          <ProductDialog
            key={selected.id}
            product={selected}
            lang={lang}
            close={() => setSelected(null)}
          />
        )}
      </main>
    </MotionConfig>
  );
}
