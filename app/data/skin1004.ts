import type { Product } from "../types/catalog";

// Confirmed stock from the owner's packaging photographs. Exact sizes are intentional.
export const skin1004Products: Product[] = [
  {
    id: "travel-kit",
    brand: "SKIN1004",
    name: "Madagascar Centella Travel Kit",
    category: "skin",
    available: true,
    images: ["/products/travel-kit.png", "/products/travel-kit-2.jpg"],
    tone: "#eff4f1",
    label: { ar: "مجموعة السفر والتجربة · 5 منتجات", en: "Travel & trial kit · 5 mini products" },
    description: {
      ar: "خمس خطوات بحجم صغير لاكتشاف مجموعة سنتيلا: تنظيف، تونر، أمبول وترطيب. اختيار عملي للسفر أو تجربة الروتين قبل شراء الأحجام الكبيرة.",
      en: "Meet the Centella collection in five mini sizes, from cleansing to hydration. A compact set for travel or discovering your routine before choosing full sizes.",
    },
    source: "https://www.skin1004.com/products/skin1004-madagascar-centella-travel-kit",
    details: {
      size: "5 minis · 30 + 20 + 30 + 30 + 30 ml",
      skinType: {
        ar: "العادية والمختلطة والجافة، حسب تحمل كل تركيبة.",
        en: "Normal, combination and dry skin, subject to individual tolerance.",
      },
      contents: {
        ar: [
          "زيت Light Cleansing Oil · 30 مل",
          "غسول Ampoule Foam · 20 مل",
          "تونر Toning Toner · 30 مل",
          "Centella Ampoule · 30 مل",
          "Soothing Cream · 30 مل",
        ],
        en: [
          "Light Cleansing Oil · 30 ml",
          "Ampoule Foam · 20 ml",
          "Toning Toner · 30 ml",
          "Centella Ampoule · 30 ml",
          "Soothing Cream · 30 ml",
        ],
      },
      ingredients: {
        ar: [
          "مستخلص Centella Asiatica ضمن المجموعة.",
          "زيوت دوار الشمس والزيتون والجوجوبا في زيت التنظيف.",
          "Gluconolactone (PHA) في التونر للتقشير اللطيف.",
          "عناصر ترطيب مثل Betaine وSodium Hyaluronate؛ وCeramide NP وCholesterol في كريم الترطيب.",
        ],
        en: [
          "Centella Asiatica extract across the collection.",
          "Sunflower, olive and jojoba oils in the cleansing oil.",
          "Gluconolactone (PHA) in the toner for gentle exfoliation.",
          "Hydrators including betaine and sodium hyaluronate; ceramide NP and cholesterol in the soothing cream.",
        ],
      },
      usage: {
        ar: [
          "عند الحاجة لإزالة المكياج أو واقي الشمس: دلكي الزيت على بشرة ويدين جافتين، أضيفي ماءً ليصبح حليبيًا ثم اشطفيه.",
          "رغّوي الغسول بالماء، دلكي البشرة المبللة بلطف ثم اشطفي.",
          "بعد التنظيف، ضعي التونر دون شطف حسب تحمل بشرتك.",
          "وزعي قطرات الأمبول ثم كريم الترطيب. في النهار أضيفي واقي شمس منفصلًا.",
        ],
        en: [
          "When removing makeup or sunscreen, massage oil onto dry skin with dry hands. Add water to emulsify, then rinse.",
          "Lather the foam cleanser with water, massage damp skin gently and rinse.",
          "Apply the toner after cleansing, as tolerated; do not rinse.",
          "Follow with a few drops of ampoule and the soothing cream. Add a separate sunscreen in the daytime.",
        ],
      },
      caution: {
        ar: "المجموعة لا تحتوي على واقي شمس. أدخلي المنتجات تدريجيًا؛ التونر مقشر، وبعض التركيبات تحتوي على زيوت عطرية. كل عبوة لها قائمة مكونات مستقلة.",
        en: "Sunscreen is not included. Introduce products gradually: the toner exfoliates and some formulas contain aromatic oils. Each mini has its own ingredient list.",
      },
    },
  },
  {
    id: "poremizing-toner",
    brand: "SKIN1004",
    name: "Madagascar Centella Poremizing Clear Toner",
    category: "skin",
    available: true,
    images: ["/products/poremizing-toner.png"],
    tone: "#f6edf0",
    imageTransform: "translateY(-10%) scale(1.35)",
    label: { ar: "تونر مقشر للعناية بالمسام · 210 مل", en: "Exfoliating pore-care toner · 210 ml" },
    description: {
      ar: "تونر مائي بأحماض AHA وBHA وPHA وLHA، يساعد على إزالة الخلايا الميتة والشوائب السطحية للحصول على ملمس أنعم.",
      en: "A watery toner combining AHA, BHA, PHA and LHA to help lift dead surface cells and impurities for a smoother-feeling complexion.",
    },
    source: "https://www.skin1004.com/products/poremizing-clear-toner",
    details: {
      size: "210 ml",
      skinType: {
        ar: "العادية والمختلطة والدهنية التي تتحمل التقشير.",
        en: "Normal, combination and oily skin that tolerates exfoliation.",
      },
      ingredients: {
        ar: [
          "Centella Asiatica Extract وأملاح معدنية.",
          "Salicylic Acid (BHA) وCapryloyl Salicylic Acid (LHA).",
          "Gluconolactone (PHA)، وCitric Acid وGlycolic Acid (AHA).",
          "Panthenol وBetaine وAllantoin، مع أشكال من حمض الهيالورونيك.",
        ],
        en: [
          "Centella Asiatica extract and mineral salts.",
          "Salicylic acid (BHA) and capryloyl salicylic acid (LHA).",
          "Gluconolactone (PHA), citric acid and glycolic acid (AHAs).",
          "Panthenol, betaine, allantoin and forms of hyaluronic acid.",
        ],
      },
      usage: {
        ar: [
          "بعد التنظيف، وزعي كمية صغيرة براحة اليد أو قطنة، مع تجنب العينين والشفاه.",
          "اتركيه دون شطف ثم استخدمي مرطبًا. ابدئي بتكرار قليل وزيديه فقط إذا كانت بشرتك تتحمله.",
          "استخدمي واقي شمس في النهار.",
        ],
        en: [
          "After cleansing, apply a small amount with your palms or a cotton pad, avoiding eyes and lips.",
          "Leave on and follow with moisturiser. Start infrequently and increase only as tolerated.",
          "Use sunscreen during the day.",
        ],
      },
      caution: {
        ar: "ليس تونر ترطيب فقط، ولا يغلق المسام نهائيًا. تجنبي الجلد المتهيج والإفراط في التقشير، وأوقفيه عند التهيج.",
        en: "This is an exfoliant, not just a hydrating toner. It does not permanently close pores. Avoid irritated skin and over-exfoliation; stop if irritation occurs.",
      },
    },
  },
  {
    id: "tea-trica-b5",
    brand: "SKIN1004",
    name: "Madagascar Centella Tea-Trica B5 Cream",
    category: "skin",
    available: true,
    images: ["/products/tea-trica-b5.png"],
    tone: "#edf4ef",
    imageTransform: "translateY(-10%) scale(1.35)",
    label: {
      ar: "جل كريم مرطب ببانثينول 5% · 75 مل",
      en: "5% panthenol moisturising gel cream · 75 ml",
    },
    description: {
      ar: "جل كريم يجمع البانثينول مع سنتيلا وشجرة الشاي لترطيب البشرة ودعم حاجزها، بقوام خفيف.",
      en: "A lightweight gel cream pairing panthenol with Centella and tea tree for hydration and skin-barrier support.",
    },
    source: "https://www.skin1004.com/products/skin1004-madagascar-centella-tea-trica-b5-cream",
    details: {
      size: "75 ml",
      skinType: {
        ar: "العادية والمختلطة والدهنية، مع مراعاة الحساسية الفردية.",
        en: "Normal, combination and oily skin; individual sensitivities still matter.",
      },
      ingredients: {
        ar: [
          "Panthenol بنسبة 5% (بروفيتامين B5).",
          "ماء ومستخلص وزيت شجرة الشاي، ومستخلصات Centella Asiatica.",
          "Ceramide NP وNiacinamide وGlycerin.",
          "Allantoin وBeta-Glucan وأشكال من حمض الهيالورونيك.",
        ],
        en: [
          "5% panthenol (provitamin B5).",
          "Tea tree water, extract and oil, with Centella Asiatica extracts.",
          "Ceramide NP, niacinamide and glycerin.",
          "Allantoin, beta-glucan and forms of hyaluronic acid.",
        ],
      },
      usage: {
        ar: [
          "بعد التونر والسيروم، وزعي كمية مناسبة على الوجه وربتي بلطف.",
          "يُستخدم كخطوة الترطيب؛ في الصباح يتبعه واقي الشمس.",
        ],
        en: [
          "After toner and serum, spread a suitable amount over the face and pat gently.",
          "Use as your moisturising step; follow with sunscreen in the morning.",
        ],
      },
      caution: {
        ar: "يحتوي على زيت شجرة الشاي؛ ليس خاليًا من الزيوت العطرية، وليس دواءً لعلاج الحبوب. اختبري تحمله قبل الاستخدام المنتظم.",
        en: "Contains tea tree oil, so it is not essential-oil-free. It is not an acne medicine. Check tolerance before regular use.",
      },
    },
  },
  {
    id: "sun-stick",
    brand: "SKIN1004",
    name: "Madagascar Centella Hyalu-Cica Silky-Fit Sun Stick SPF50+ PA++++",
    category: "skin",
    available: true,
    images: ["/products/sun-stick.png"],
    tone: "#eaf2f8",
    imageTransform: "translateY(-30%) scale(1.9)",
    label: { ar: "واقي شمس ستيك بملمس حريري · 20 جم", en: "Silky-finish sunscreen stick · 20 g" },
    description: {
      ar: "واقي شمس ستيك بدرجة SPF50+ PA++++، بحجم عملي للحمل وإعادة التطبيق، مع سنتيلا وأشكال من حمض الهيالورونيك.",
      en: "An SPF50+ PA++++ sun stick in a portable format for reapplication, with Centella and forms of hyaluronic acid.",
    },
    source:
      "https://skin1004india.com/products/skin1004india-madagascar-centella-hyalu-cica-silky-fit-sun-stick-20g",
    details: {
      size: "20 g · SPF50+ PA++++",
      skinType: {
        ar: "لمن تفضل قوام الستيك الحريري؛ الملاءمة تعتمد على تحمل البشرة.",
        en: "For those who prefer a silky stick texture; suitability depends on skin tolerance.",
      },
      ingredients: {
        ar: [
          "Centella Asiatica Extract.",
          "Sodium Hyaluronate وHydrolyzed Hyaluronic Acid وHyaluronic Acid.",
          "فلاتر UV منها Diethylamino Hydroxybenzoyl Hexyl Benzoate وEthylhexyl Triazone وPolysilicone-15.",
          "Tocopheryl Acetate وBisabolol.",
        ],
        en: [
          "Centella Asiatica extract.",
          "Sodium hyaluronate, hydrolyzed hyaluronic acid and hyaluronic acid.",
          "UV filters including diethylamino hydroxybenzoyl hexyl benzoate, ethylhexyl triazone and polysilicone-15.",
          "Tocopheryl acetate and bisabolol.",
        ],
      },
      usage: {
        ar: [
          "كآخر خطوة صباحًا، ضعيه بالتساوي على المناطق المكشوفة قبل التعرض للشمس.",
          "للستيك: مرريه ذهابًا وإيابًا أربع مرات على كل منطقة ثم وزعيه للحصول على تغطية متجانسة؛ تمريرة واحدة لا تكفي.",
          "جددي التطبيق كل ساعتين خارج المنزل وبعد السباحة أو التعرق.",
        ],
        en: [
          "Apply evenly to exposed skin as your final morning step before sun exposure.",
          "For a stick, use four back-and-forth passes per area, then rub in for even coverage; a single swipe is not enough.",
          "Reapply every two hours outdoors and after swimming or sweating.",
        ],
      },
      caution: {
        ar: "تجنبي العينين. لا نفترض أنه مقاوم للماء؛ استخدمي منتجًا مثبت المقاومة عند السباحة، مع الظل والملابس الواقية.",
        en: "Avoid the eyes. Water resistance is not assumed; choose a verified water-resistant product for swimming, alongside shade and protective clothing.",
      },
    },
  },
  {
    id: "probio-ampoule",
    brand: "SKIN1004",
    name: "Madagascar Centella Probio-Cica Intensive Ampoule",
    category: "skin",
    available: true,
    images: ["/products/probio-ampoule.jpg"],
    tone: "#f4eeee",
    imageTransform: "translateY(-22%) scale(1.7)",
    label: { ar: "أمبول لدعم حاجز البشرة · 30 مل", en: "Barrier-support ampoule · 30 ml" },
    description: {
      ar: "أمبول بقوام حليبي يجمع سنتيلا ومكونات مشتقة من التخمير مع السيراميد، لترطيب البشرة ودعم حاجزها وإضفاء مظهر أكثر إشراقًا.",
      en: "A milky ampoule combining Centella and fermentation-derived ingredients with ceramide to hydrate, support the skin barrier and enhance the look of radiance.",
    },
    source: "https://www.skin1004.com/products/probio-cica-intensive-ampoule",
    details: {
      size: "30 ml",
      skinType: { ar: "الجافة والعادية والمختلطة.", en: "Dry, normal and combination skin." },
      ingredients: {
        ar: [
          "Centella Asiatica ومكونات مشتقة من التخمير.",
          "Ceramide NP وPhytosphingosine وPhytosterols.",
          "Niacinamide وPanthenol وBetaine وSodium Hyaluronate.",
        ],
        en: [
          "Centella Asiatica and fermentation-derived ingredients.",
          "Ceramide NP, phytosphingosine and phytosterols.",
          "Niacinamide, panthenol, betaine and sodium hyaluronate.",
        ],
      },
      usage: {
        ar: [
          "على بشرة نظيفة وبعد التونر إن استُخدم، وزعي قطرات قليلة وربتي بلطف.",
          "اتبعيه بمرطب، ثم واقي شمس في الصباح.",
        ],
        en: [
          "On cleansed skin, after toner if used, spread a few drops and pat gently.",
          "Follow with moisturiser and, in the morning, sunscreen.",
        ],
      },
      caution: {
        ar: "منتج تجميلي لدعم الترطيب والحاجز، وليس علاجًا للإكزيما أو الحساسية. راجعي المكونات إذا كانت لديك حساسية معروفة.",
        en: "Cosmetic hydration and barrier support, not a treatment for eczema or allergies. Check ingredients if you have a known sensitivity.",
      },
    },
  },
  {
    id: "air-fit-light",
    brand: "SKIN1004",
    name: "Madagascar Centella Air-Fit Suncream Light SPF30 PA++++",
    category: "skin",
    available: true,
    images: ["/products/air-fit-light.png"],
    tone: "#f1f4ec",
    imageTransform: "translateY(-10%) scale(1.35)",
    label: { ar: "واقي شمس معدني خفيف · 50 مل", en: "Light mineral sunscreen · 50 ml" },
    description: {
      ar: "واقي شمس معدني بأكسيد الزنك وسنتيلا، بدرجة SPF30 PA++++. إصدار Light بحجم 50 مل.",
      en: "A zinc-oxide mineral sunscreen with Centella and SPF30 PA++++ protection. The Light version comes in a 50 ml tube.",
    },
    source:
      "https://skin1004india.com/products/madagascar-centella-air-fit-suncream-light-spf30-pa",
    details: {
      size: "50 ml · SPF30 PA++++",
      skinType: {
        ar: "لمن تفضل واقي شمس معدني، مع اختبار التحمل للبشرة الحساسة.",
        en: "For those who prefer mineral sunscreen; check tolerance on sensitive skin.",
      },
      ingredients: {
        ar: [
          "Zinc Oxide: فلتر الحماية المعدني.",
          "Centella Asiatica Extract وNiacinamide.",
          "مستخلصا Portulaca Oleracea وHouttuynia Cordata، مع Adenosine.",
        ],
        en: [
          "Zinc oxide: the mineral UV filter.",
          "Centella Asiatica extract and niacinamide.",
          "Portulaca oleracea and Houttuynia cordata extracts, with adenosine.",
        ],
      },
      usage: {
        ar: [
          "كآخر خطوة صباحًا، ضعي كمية كافية بالتساوي على الوجه والرقبة والمناطق المكشوفة قبل الشمس، واتّبعي تعليمات العبوة.",
          "جددي التطبيق كل ساعتين خارج المنزل وبعد السباحة أو التعرق.",
        ],
        en: [
          "As your final morning step, apply generously and evenly to the face, neck and exposed areas before sun exposure; follow the package directions.",
          "Reapply every two hours outdoors and after swimming or sweating.",
        ],
      },
      caution: {
        ar: "قد تترك الفلاتر المعدنية أثرًا أبيض بحسب لون البشرة والكمية. تجنبي العينين؛ لا يُفترض أنه مقاوم للماء، ولا يغني عن الظل والملابس الواقية.",
        en: "Mineral filters may leave a white cast depending on skin tone and amount used. Avoid eyes. Water resistance is not assumed; use shade and protective clothing too.",
      },
    },
  },
  {
    id: "centella-ampoule",
    brand: "SKIN1004",
    name: "Madagascar Centella Ampoule",
    category: "skin",
    available: true,
    images: ["/products/centella-ampoule.png"],
    tone: "#f5f3ee",
    imageTransform: "translateY(-8%) scale(1.3)",
    label: {
      ar: "أمبول سنتيلا للترطيب والتهدئة · 55 مل",
      en: "Soothing & hydrating Centella ampoule · 55 ml",
    },
    description: {
      ar: "أمبول سنتيلا الأصلي بقوام مائي خفيف، لترطيب البشرة والمساعدة على تهدئة مظهر الاحمرار. خطوة بسيطة قبل المرطب.",
      en: "The original Centella ampoule with a light, watery texture to hydrate and help soothe the appearance of redness. A simple step before moisturiser.",
    },
    source: "https://www.skin1004.com/products/skin1004-madagascar-centella-ampoule",
    details: {
      size: "55 ml",
      skinType: {
        ar: "كل أنواع البشرة، خاصة الجافة والرقيقة، حسب التحمل.",
        en: "All skin types, especially dry and delicate skin, as tolerated.",
      },
      ingredients: {
        ar: [
          "Centella Asiatica Extract هو المكون البارز.",
          "تسرد التركيبة الحالية المنشورة أيضًا Water وGlycerin وButylene Glycol، إضافة إلى 1,2-Hexanediol وCellulose Gum وEthylhexylglycerin.",
        ],
        en: [
          "Centella Asiatica extract is the featured ingredient.",
          "The current published formula also lists water, glycerin, butylene glycol, 1,2-hexanediol, cellulose gum and ethylhexylglycerin.",
        ],
      },
      usage: {
        ar: [
          "بعد التنظيف والتونر إن استُخدم، ضعي قطرات قليلة ووزعيها ثم ربتي بلطف.",
          "اتبعيه بمرطب. في النهار أضيفي واقي شمس.",
        ],
        en: [
          "After cleansing and toner if used, spread a few drops and pat gently.",
          "Follow with moisturiser. Add sunscreen during the day.",
        ],
      },
      caution: {
        ar: "قد تختلف التركيبة بين الإصدارات. راجعي قائمة المكونات على عبوتك، خاصةً إذا كانت لديكِ حساسية معروفة.",
        en: "Formulas may vary between versions. Check the ingredient list on your package, especially if you have a known allergy.",
      },
    },
  },
];
