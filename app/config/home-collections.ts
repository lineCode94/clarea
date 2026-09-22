// Curated homepage groups. Stock and product details always come from data/products.ts.
export const homeCategories = [
  {
    id: "skin",
    query: "",
    image: "/products/travel-kit.png",
    ar: "العناية بالبشرة",
    en: "Skincare",
    tone: "#f5e9ec",
  },
  {
    id: "hair",
    query: "",
    image: "/products/import-20260920/redken-extreme-shampoo-75ml.webp",
    ar: "العناية بالشعر",
    en: "Haircare",
    tone: "#eef1f7",
  },
  {
    id: "supplements",
    query: "",
    image: "/products/import-20260920/foodology-coleology-cutting-jelly-10-sticks.webp",
    ar: "المكملات الغذائية",
    en: "Supplements",
    tone: "#f5e9ec",
  },
  {
    id: "oral",
    query: "",
    image: "/products/import-20260920/lion-zact-toothpaste.webp",
    ar: "العناية بالفم",
    en: "Oral Care",
    tone: "#edf2f8",
  },
  {
    id: "skin",
    query: "sun",
    image: "/products/sun-stick.png",
    ar: "الحماية من الشمس",
    en: "Sun Protection",
    tone: "#edf2f8",
  },
];

export const homeCollections = {
  newArrivals: [
    "mary-may-eye-cream",
    "kaminomoto-trigger",
    "retinol",
    "tirtir-cooling-pads",
    "perfectil-hair",
  ],
  care: ["travel-kit", "poremizing-toner", "tea-trica-b5", "centella-ampoule"],
  skin1004: ["probio-ampoule", "sun-stick", "air-fit-light", "centella-ampoule"],
};

// Popular picks checked on 2026-09-22; selection is editorial, not a global sales ranking.
// https://www.skin1004.com/collections/best-sellers
// https://beautyofjoseon.com/collections/best-sellers
// https://www.yesstyle.com/en/axis-y-dark-spot-correcting/info.html/pid.1078919512
export const popularProductIds = [
  "axis-y-dark-spot-correcting-glow-serum",
  "beauty-of-joseon-relief-sun-aqua-fresh-rice-b5-spf50-pa",
  "centella-ampoule",
  "skin1004-madagascar-centella-light-cleansing-oil-200ml",
  "beauty-of-joseon-revive-serum-ginseng-snail-mucin",
];
