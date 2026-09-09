"use client";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";

export default function FaqSection({ lang }: { lang: Language }) {
  const t = text[lang];

  return (
    <section
      id="faq"
      className="page-width grid gap-7 border-t border-line py-12 md:grid-cols-[1fr_2fr]"
    >
      <h2 className="text-2xl">{t.faq}</h2>
      <div>
        {t.faqs.map(([q, a]) => (
          <details key={q} className="border-b border-line py-4">
            <summary className="cursor-pointer font-bold">{q}</summary>
            <p className="mt-3 mb-0 leading-loose text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
