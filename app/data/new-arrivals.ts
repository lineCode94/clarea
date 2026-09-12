import type { Product } from "../types/catalog";

export const newArrivals: Product[] = [
  {
    id: "mary-may-eye-cream",
    brand: "MARY & MAY",
    name: "Tranexamic Acid + Glutathione Eye Cream",
    category: "skin",
    available: true,
    images: ["/products/mary-may-eye-cream.jpg", "/products/mary-may-eye-texture.jpg"],
    tone: "#f3f1eb",
    label: {
      ar: "ماري آند ماي — كريم للعناية بمحيط العين",
      en: "Brightening eye care",
    },
    description: {
      ar: "كريم عين 30 جم، يحتوي على حمض الترانيكساميك والجلوتاثيون بتركيز 1000 جزء في المليون لكل منهما، للمساعدة على تحسين مظهر الهالات الداكنة وتفاوت لون البشرة حول العين. مع النياسيناميد وفيتامين C.",
      en: "A 30 g eye cream with 1,000 ppm each of tranexamic acid and glutathione to help improve the appearance of dark circles and uneven tone around the eyes. With niacinamide and vitamin C.",
    },
    source: "https://marynmay.com/products/mary-may-tranexamic-acid-glutathione-eye-cream-30g",
  },
  {
    id: "kaminomoto-trigger",
    brand: "KAMINOMOTO",
    name: "Hair Growth Trigger",
    category: "hair",
    available: true,
    images: ["/products/kaminomoto-trigger-official.png"],
    tone: "#f2f0e9",
    label: {
      ar: "العناية بالشعر وفروة الرأس",
      en: "Hair & scalp care",
    },
    description: {
      ar: "هير جروث تريجر من كامينوموتو للعناية بالشعر وفروة الرأس. تواصلي معنا للاستفسار عن تفاصيل العبوة.",
      en: "Hair Growth Trigger by Kaminomoto for your hair and scalp care routine. Contact us for pack details.",
    },
    source: "https://www.kaminomoto.co.jp/english/product/hair_22asia",
  },
  {
    id: "retinol",
    brand: "",
    name: "Retinol",
    category: "skin",
    available: true,
    images: ["/products/retinol-pack.jpg"],
    tone: "#faf5ef",
    label: {
      ar: "ريتينول — تفاصيل المنتج قريبًا",
      en: "Retinol — details coming soon",
    },
    description: {
      ar: "منتج ريتينول متاح الآن. تواصلي معنا لمعرفة الماركة والتركيز وتفاصيل العبوة.",
      en: "A retinol product, available now. Contact us for the brand, strength and pack details.",
    },
  },
  {
    id: "tirtir-cooling-pads",
    brand: "TIRTIR",
    name: "Ice-Cooling Toner Pack Pads",
    category: "skin",
    available: true,
    images: ["/products/tirtir-cooling-pads.png"],
    tone: "#eef5fa",
    label: {
      ar: "بادز تونر للعناية اليومية",
      en: "Toner pads for daily care",
    },
    description: {
      ar: "بادز آيس كولينج تونر من تيرتير، 120 قطعة بعبوة 160 مل. خطوة للعناية بالبشرة بإحساس منعش.",
      en: "TIRTIR Ice-Cooling Toner Pack Pads, 120 pads in a 160 ml pack. A refreshing step for your skincare routine.",
    },
    source: "https://tirtir.global/products/ice-cooling-toner-pack-pads",
  },
  {
    id: "perfectil-hair",
    brand: "VITABIOTICS",
    name: "Perfectil Hair Extra Support — 60 Tablets",
    category: "supplements",
    available: true,
    images: ["/products/perfectil-hair.png"],
    tone: "#f5eff9",
    label: {
      ar: "مكمل غذائي للشعر والبشرة والأظافر",
      en: "Hair, skin & nails supplement",
    },
    description: {
      ar: "بيرفكتيل هير إكسترا سبورت من فيتابيوتكس، عبوة 60 قرصًا. مكمل غذائي؛ راجعي تعليمات العبوة واستشيري الصيدلي بشأن ملاءمته لكِ.",
      en: "Perfectil Hair Extra Support by Vitabiotics, 60 tablets. A food supplement. Follow the pack instructions and ask a pharmacist about suitability.",
    },
    source: "https://www.vitabiotics.com/products/perfectil-hair-tablets",
  },
];
