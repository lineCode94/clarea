"use client";
import Image from "next/image";
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
      <button
        onClick={() => onSelect(product)}
        aria-label={`${t.details}: ${product.name}`}
        className="relative block aspect-[1.12] w-full cursor-pointer overflow-hidden rounded-lg text-start"
        style={{ background: product.tone }}
      >
        <motion.div
          whileHover={reduced ? {} : { scale: 1.055, y: -4 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
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
        <span
          className={`absolute start-3 top-3 rounded-full border border-white/50 px-3 py-1.5 text-xs backdrop-blur-md ${product.available ? "bg-white/90 text-[#365842]" : "bg-white/85 text-[#765961]"}`}
        >
          {product.available ? t.available : t.unavailable}
        </span>
        <span className="absolute bottom-3 end-3 grid size-11 place-items-center rounded-full bg-white text-brand shadow-sm transition-colors group-hover:bg-brand group-hover:text-white">
          <TbPlus size={22} />
        </span>
      </button>
      <div className="pt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
          <span dir="ltr">{product.brand}</span>
          <span>{t.skin}</span>
        </div>
        <button className="cursor-pointer text-start" onClick={() => onSelect(product)}>
          <h3 className="mb-1 text-base leading-relaxed font-bold">{product.name}</h3>
        </button>
        <p className="mb-0 text-sm text-muted">{product.label[lang]}</p>
      </div>
    </>
  );
}

