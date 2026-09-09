"use client";
import { text } from "../../content/catalog";
import type { Language } from "../../types/catalog";
import { TbSparkles, TbPackage, TbMessageCircle } from "react-icons/tb";
export default function AboutSection({ lang }: { lang: Language }) {
  const t = text[lang];

  return (
    <section id="about" className="page-width grid gap-8 py-14 md:grid-cols-2 md:py-20">
      <h2 className="text-3xl text-brand">{t.about}</h2>
      <div>
        <p className="leading-loose text-muted">{t.aboutCopy}</p>
        <div className="mt-7 flex flex-wrap gap-5">
          {t.values.map((label, i) => {
            const Icon = [TbSparkles, TbPackage, TbMessageCircle][i];
            return (
              <span key={label} className="flex items-center gap-2 text-sm">
                <Icon size={21} className="text-deep-gold" />
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
