import type { Product } from "../types/catalog";
import { newArrivals } from "./new-arrivals";
import { skin1004Products } from "./skin1004";

// Only set available to true after stock is confirmed. Add new products here.
export const products: Product[] = [
  ...newArrivals,
  ...skin1004Products,
  {
    id: "centella-duo",
    brand: "SKIN1004",
    name: "Madagascar Centella Cleansing Duo",
    category: "skin",
    available: true,
    images: ["/centella-duo.webp", "/centella-studio.webp"],
    tone: "#f4f4ee",
    label: { ar: "مجموعة التنظيف المزدوج", en: "Double-cleansing set" },
    description: {
      ar: "زيت تنظيف 200 مل وغسول رغوي 125 مل، في مجموعة واحدة لخطوتي التنظيف اليومي.",
      en: "A 200 ml cleansing oil and 125 ml foam cleanser, paired for your daily double cleanse.",
    },
  },
  {
    id: "teca-ampoule",
    brand: "SKIN1004",
    name: "Centella Teca Ampoule",
    category: "skin",
    available: false,
    images: ["/teca-ampoule.png"],
    tone: "#f5f0ee",
    label: { ar: "خطوة السيروم", en: "The serum step" },
    description: {
      ar: "أمبول Centella Teca من SKIN1004. غير متاح للطلب حاليًا؛ تواصلي معنا للاستفسار عن توفره.",
      en: "The Centella Teca ampoule by SKIN1004. Currently unavailable to order. Contact us to ask about availability.",
    },
    source: "https://www.skin1004.com/products/centella-teca-ampoule",
  },
  {
    id: "hyalu-milk",
    brand: "SKIN1004",
    name: "Hyalu-Teca Glass Skin Milk",
    category: "skin",
    available: false,
    images: ["/hyalu-milk.png"],
    tone: "#edf2f5",
    label: { ar: "اختيارات الترطيب", en: "Hydration care" },
    description: {
      ar: "Glass Skin Milk من مجموعة Hyalu-Teca. معروض للاستكشاف، وغير متاح للطلب حاليًا.",
      en: "Glass Skin Milk from the Hyalu-Teca collection. Currently unavailable to order.",
    },
    source: "https://www.skin1004.com/products/hyalu-teca-glass-skin-milk",
  },
  {
    id: "teca-cream",
    brand: "SKIN1004",
    name: "Centella Teca Cream",
    category: "skin",
    available: false,
    images: ["/teca-cream.png"],
    tone: "#f1f2ec",
    label: { ar: "كريم للعناية اليومية", en: "Daily care cream" },
    description: {
      ar: "كريم Centella Teca من SKIN1004. غير متاح للطلب حاليًا.",
      en: "Centella Teca cream by SKIN1004. Currently unavailable to order.",
    },
    source: "https://www.skin1004.com/products/centella-teca-cream",
  },
  {
    id: "teca-toner",
    brand: "SKIN1004",
    name: "Centella Teca Soothing Toner",
    category: "skin",
    available: false,
    images: ["/teca-toner.png"],
    tone: "#f5eeee",
    label: { ar: "خطوة التونر", en: "The toner step" },
    description: {
      ar: "تونر Centella Teca من SKIN1004. معروض ضمن اختياراتنا، وغير متاح للطلب حاليًا.",
      en: "Centella Teca toner by SKIN1004. Currently unavailable to order.",
    },
    source: "https://www.skin1004.com/products/centella-teca-soothing-toner",
  },
];

