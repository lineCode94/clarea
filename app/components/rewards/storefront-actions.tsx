"use client";

import { TbGift, TbBrandWhatsapp } from "react-icons/tb";
import { rewardsText } from "../../content/rewards";
import { whatsappLink } from "../../lib/whatsapp";
import { useGiftWheel } from "../../hooks/use-gift-wheel";
import type { Language } from "../../types/catalog";
import GiftDialog from "./gift-dialog";

export default function StorefrontActions({
  lang,
  open,
  onOpen,
  onClose,
}: {
  lang: Language;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const wheel = useGiftWheel();
  const t = rewardsText[lang];
  return (
    <>
      <button
        onClick={onOpen}
        title={t.gifts}
        aria-label={t.tab}
        className="gift-tab fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-[#793448] xl:bottom-auto xl:left-0 xl:top-1/2 xl:h-auto xl:w-auto xl:-translate-y-1/2 xl:flex-col xl:gap-2 xl:rounded-none xl:rounded-e-lg xl:px-2 xl:py-4"
      >
        <TbGift size={23} />
        <span className="hidden text-sm font-bold xl:block xl:[writing-mode:vertical-rl]">
          {t.tab}
        </span>
      </button>
      <a
        href={whatsappLink(lang)}
        target="_blank"
        rel="noreferrer"
        title={t.whatsapp}
        aria-label={t.whatsapp}
        className="floating-whatsapp fixed bottom-[calc(20px+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full border-[3px] border-white bg-[#25d366] text-white shadow-lg transition-transform hover:scale-105"
      >
        <TbBrandWhatsapp size={31} />
      </a>
      {open && <GiftDialog lang={lang} wheel={wheel} close={onClose} />}
    </>
  );
}
