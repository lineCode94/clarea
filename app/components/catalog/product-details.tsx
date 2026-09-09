import type { Language, Product } from "../../types/catalog";

export default function ProductDetails({ product, lang }: { product: Product; lang: Language }) {
  const details = product.details;
  if (!details) return null;
  const ar = lang === "ar";
  const sections = [
    ...(details.contents
      ? [{ title: ar ? "داخل المجموعة" : "Inside the set", items: details.contents[lang] }]
      : []),
    { title: ar ? "طريقة الاستخدام" : "How to use", items: details.usage[lang] },
    { title: ar ? "المكونات الأساسية" : "Key ingredients", items: details.ingredients[lang] },
  ];
  return (
    <div className="mt-8 border-t border-line" data-product-details={product.id}>
      <p className="my-4 text-sm leading-loose text-muted">
        <strong className="text-foreground">{ar ? "نوع البشرة: " : "Skin type: "}</strong>
        {details.skinType[lang]}
      </p>
      {sections.map(({ title, items }, index) => (
        <details key={title} open={index === 0} className="border-b border-line py-2">
          <summary className="cursor-pointer py-2 font-bold text-brand">{title}</summary>
          <ul className="list-disc space-y-2 ps-5 py-3 text-sm leading-loose text-muted">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ))}
      <h3 className="mb-2 mt-5 text-sm">{ar ? "قبل الاستخدام" : "Before you use it"}</h3>
      <p className="text-sm leading-loose text-muted">{details.caution[lang]}</p>
      <p className="text-xs leading-loose text-muted">
        {ar
          ? "جرّبي المنتج على مساحة صغيرة أولًا، وأوقفي الاستخدام عند التهيج. المذكور هنا أبرز المكونات؛ راجعي القائمة الكاملة على العبوة، خاصةً إذا كانت لديكِ حساسية معروفة. قد تختلف التركيبات بين الإصدارات."
          : "Test on a small area first and stop use if irritation occurs. These are key ingredients only. Check the full list on your package, especially if you have a known allergy, as formulas may vary."}
      </p>
      {product.source && (
        <a
          href={product.source}
          target="_blank"
          rel="noreferrer"
          className="inline-block py-2 text-xs text-brand underline underline-offset-4"
        >
          {ar ? "مرجع معلومات المنتج" : "Product information source"}
        </a>
      )}
    </div>
  );
}
