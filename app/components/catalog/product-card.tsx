"use client";
import Image from "next/image";
import ProductPrice from "./product-price";
import { motion, useReducedMotion } from "framer-motion";
import { TbPlus } from "react-icons/tb";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";
import type { Product } from "../../types/catalog";
export default function ProductCard({
  product,
  lang,
  onSelect,
  priority = false,
}: {
  product: Product;
  lang: Language;
  onSelect: (product: Product) => void;
  priority?: boolean;
}) {
  const t = text[lang];
  const reduced = useReducedMotion();
  return (
    <>
      <motion.button
        initial="initial"
        whileHover={reduced ? "initial" : "hover"}
        onClick={() => onSelect(product)}
        aria-label={`${t.details}: ${product.name}`}
        className="group relative block aspect-[1.12] w-full cursor-pointer overflow-hidden rounded-lg text-start"
        style={{ background: product.tone }}
      >
        <motion.div
          variants={{
            initial: { scale: 1, y: 0 },
            hover: { scale: 1.08, y: -6 },
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute inset-4"
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 479px) 95vw, (max-width: 1023px) 45vw, 370px"
            className="object-contain mix-blend-multiply"
            style={{ transform: product.imageTransform }}
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 370px"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </motion.div>

        {/* Premium Shine Overlay */}
        <motion.div
          variants={{
            initial: { opacity: 0, x: "-100%", y: "100%" },
            hover: { opacity: 1, x: "100%", y: "-100%" },
          }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/50 to-transparent"
        />

        <div className="absolute start-3 top-3 z-20 flex flex-col gap-2">
          {product.discount != null && product.discount > 0 && (
            <span className="self-start rounded-full bg-[#fca5a5] px-3 py-1.5 text-xs font-bold text-[#7f1d1d] shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              -{product.discount}%
            </span>
          )}
          <span
            className={`rounded-full border border-white/50 px-3 py-1.5 text-xs backdrop-blur-md transition-transform duration-300 group-hover:scale-105 ${product.available ? "bg-white/90 text-[#365842]" : "bg-white/85 text-[#765961]"}`}
          >
            {product.stock_status === "coming_soon"
              ? lang === "ar"
                ? "🔔 قريباً"
                : "Coming soon"
              : product.available
                ? t.available
                : lang === "ar"
                  ? "انتهى المخزون"
                  : "Out of stock"}
          </span>
        </div>
        <span className="absolute bottom-3 end-3 z-20 grid size-11 place-items-center rounded-full bg-white text-brand shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-brand group-hover:text-white group-hover:shadow-md group-hover:rotate-90">
          <TbPlus size={22} />
        </span>
      </motion.button>
      <div className="pt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
          <span dir="ltr">{product.brand}</span>
          <span>{t[product.category]}</span>
        </div>
        <button className="cursor-pointer text-start" onClick={() => onSelect(product)}>
          <h3 className="mb-1 text-base leading-relaxed font-bold">{product.name}</h3>
        </button>
        <p className="mb-0 text-sm text-muted">{product.label[lang]}</p>
        <ProductPrice product={product} lang={lang} />
      </div>
    </>
  );
}
