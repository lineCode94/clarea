import type { Language, Product } from "../../types/catalog";

export default function ProductPrice({ product, lang }: { product: Product; lang: Language }) {
  const price = product.public_price;
  return (
    <p className="mb-0 mt-3 text-lg font-bold text-brand" data-product-price={product.id}>
      {price == null ? (
        <span className="text-sm font-normal text-muted">
          {lang === "ar" ? "تواصلي معنا لمعرفة السعر" : "Contact us for the price"}
        </span>
      ) : (
        <span dir={lang === "ar" ? "rtl" : "ltr"}>
          {new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
            maximumFractionDigits: 2,
          }).format(price)}{" "}
          {lang === "ar" ? "ج.م" : "EGP"}
        </span>
      )}
    </p>
  );
}
