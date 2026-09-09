import { footerText } from "../../content/footer";
import { siteConfig } from "../../config/site";
import Image from "next/image";
import { FaInstagram, FaTiktok, FaWhatsapp, FaFacebook } from "react-icons/fa6";
import { TbArrowUp, TbArrowUpRight } from "react-icons/tb";

type Props = {
  lang: "ar" | "en";
  whatsappUrl: string;
  note: string;
};

export default function SiteFooter({ lang, whatsappUrl, note }: Props) {
  const t = footerText[lang];
  return (
    <footer
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="footer mt-8 border-t border-brand/15 bg-[#f7f7f7] text-brand"
    >
      <div className="bg-brand text-white">
        <div className="page-width grid gap-7 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12 md:py-14">
          <div className="min-w-0">
            <h2 className="mb-3 text-[1.75rem] leading-[1.5] md:text-[2.25rem]">{t.title}</h2>
            <p className="mb-0 max-w-[580px] text-base leading-[1.9] text-white/80">
              {t.description}
            </p>
          </div>
          <a
            id="whatsapp_cta_final"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg border border-white/30 bg-white px-6 py-3 font-bold text-brand transition-colors hover:bg-[#f4ddd8] focus-visible:outline-white"
          >
            <FaWhatsapp size={22} aria-hidden="true" />
            {t.cta}
            <TbArrowUpRight size={20} aria-hidden="true" className="rtl:-scale-x-100" />
          </a>
        </div>
      </div>

      <div className="page-width">
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-2 md:gap-12 lg:grid-cols-[1.3fr_0.8fr_1fr] lg:py-16 [&>*]:min-w-0">
          <div>
            <a href="#top" aria-label="Claréa" className="inline-block">
              <Image
                src="/clarea-logo-transparent.png"
                alt="Claréa — Skincare & Gifting"
                width={250}
                height={77}
                className="h-auto w-[220px] max-w-full lg:w-[250px]"
              />
            </a>
            <p className="mt-5 mb-0 max-w-[340px] text-base leading-[1.9] text-[#685b5e]">
              {t.brand}
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { name: "Instagram", href: siteConfig.social.instagram, Icon: FaInstagram },
                { name: "TikTok", href: siteConfig.social.tiktok, Icon: FaTiktok },
                { name: "Facebook", href: siteConfig.social.facebook, Icon: FaFacebook },
                { name: "WhatsApp", href: whatsappUrl, Icon: FaWhatsapp },
              ].map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  title={name}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-brand/20 transition-colors hover:border-brand hover:bg-brand hover:text-white"
                >
                  <Icon size={19} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label={t.explore}>
            <h3 className="mb-5 text-base font-bold">{t.explore}</h3>
            <ul className="m-0 grid list-none gap-2 p-0 text-[#685b5e]">
              {t.links.map((label, index) => (
                <li key={label}>
                  <a
                    href={["#collection", "#edit", "#about", "#faq"][index]}
                    className="inline-flex min-h-10 items-center hover:text-brand hover:underline underline-offset-4"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="mb-5 text-base font-bold">{t.contact}</h3>
            <p className="max-w-[340px] leading-[1.9] text-[#685b5e]">{t.contactCopy}</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 border-b border-brand/30 py-2 font-bold transition-colors hover:border-brand"
            >
              {t.message}
              <TbArrowUpRight size={20} aria-hidden="true" className="rtl:-scale-x-100" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-brand/15 pt-6 pb-[calc(100px+env(safe-area-inset-bottom))] text-xs leading-[1.9] text-[#685b5e] min-[641px]:pb-7 lg:flex-row lg:items-center lg:justify-between">
          <p className="m-0 shrink-0">
            <bdi>© {new Date().getFullYear()} Claréa.</bdi> {t.rights}
          </p>
          <p className="m-0 max-w-[490px]">{note}</p>
          <a
            href="#top"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-brand lg:self-auto"
          >
            {t.top}
            <TbArrowUp size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
