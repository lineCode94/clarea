import type { Language, Product } from "../types/catalog";
import { siteConfig } from "../config/site";

export function whatsappLink(lang: Language, product?: Product) {
  const text = product
    ? lang === "ar"
      ? `أهلًا Claréa، أود ${product.available ? "معرفة السعر وطريقة طلب" : "الاستفسار عن توفر"} ${product.name}.`
      : `Hello Claréa, I would like to ask about ${product.available ? "the price and how to order" : "availability of"} ${product.name}.`
    : lang === "ar"
      ? "أهلًا Claréa، أود الاستفسار عن اختيارات العناية المتاحة."
      : "Hello Claréa, I would like to ask about your available skincare products.";
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
