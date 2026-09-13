"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import { TbX, TbCopy, TbCheck, TbBrandWhatsapp, TbGift, TbPhone, TbSparkles } from "react-icons/tb";
import { rewardsText } from "../../content/rewards";
import { rewardsConfig } from "../../config/rewards";
import { siteConfig } from "../../config/site";
import type { Language } from "../../types/catalog";
import type { useGiftWheel } from "../../hooks/use-gift-wheel";
import PrizeWheel from "./prize-wheel";

export default function GiftDialog({
  lang,
  wheel,
  close,
}: {
  lang: Language;
  wheel: ReturnType<typeof useGiftWheel>;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drawerX = useMotionValue("-100%");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [phoneError, setPhoneError] = useState(false);
  const t = rewardsText[lang];
  const prize = rewardsConfig.prizes.find((p) => p.id === wheel.award?.prizeId);
  const result = !!prize && !wheel.spinning;
  const retry = prize?.id === "try-again";
  useEffect(() => {
    const dialog = ref.current!;
    const focus = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    drawerX.set("-100%");
    dialog.showModal();
    document.body.style.overflow = "hidden";
    // Start after showModal so the drawer enters the top layer off-screen.
    const entrance = animate(drawerX, "0%", {
      duration: 1.2,
      ease: [0.4, 0, 0.2, 1],
    });
    return () => {
      entrance.stop();
      dialog.close();
      document.body.style.overflow = overflow;
      focus?.focus();
    };
  }, [drawerX]);
  const claimText =
    lang === "ar"
      ? `أهلًا Claréa، أود تأكيد نتيجة عجلة الهدايا: ${prize?.label.ar}. الرقم المرجعي: ${wheel.award?.reference}.`
      : `Hello Claréa, please confirm my gift wheel result: ${prize?.label.en}. Reference: ${wheel.award?.reference}.`;
  return (
    <motion.dialog
      ref={ref}
      initial={false}
      style={{ x: drawerX }}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="gift-title"
      dir="ltr"
      className="gift-dialog gift-drawer fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-full max-w-none overflow-x-hidden overflow-y-auto rounded-none border-0 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/45"
    >
      <button
        autoFocus
        onClick={close}
        title={t.close}
        aria-label={t.close}
        className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white text-muted hover:text-brand"
      >
        <TbX size={23} />
      </button>
      <div className="gift-drawer-layout">
        <div className="gift-drawer-wheel">
          <PrizeWheel
            lang={lang}
            rotation={wheel.rotation}
            duration={wheel.duration}
            spinning={wheel.spinning}
            showPointer={wheel.spinning || Boolean(wheel.award)}
            onComplete={wheel.finishSpin}
          />
        </div>
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="gift-drawer-content flex min-w-0 flex-col justify-center text-center"
        >
          <Image
            src="/clarea-logo-transparent.png"
            alt="Claréa"
            width={180}
            height={55}
            className="mx-auto mb-9 h-auto w-[180px]"
          />
          {!result && (
            <h2 id="gift-title" className="mb-3 text-2xl text-brand">
              {t.title}
            </h2>
          )}
          <div aria-live="polite" aria-atomic="true">
            {result && retry ? (
              <>
                <h2 id="gift-title" data-testid="gift-result" className="mb-4 text-2xl text-brand">
                  {lang === "ar" ? "حاولي مرة أخرى" : "Try again"}
                </h2>
                <p className="text-muted">
                  {lang === "ar"
                    ? "لم تحصلي على هدية هذه المرة، لكن لديكِ فرصة إضافية. جرّبي مرة أخرى!"
                    : "No gift this time, but you have another spin. Give it another go!"}
                </p>
              </>
            ) : result ? (
              <>
                <h2
                  id="gift-title"
                  className="mb-2 flex items-center justify-center gap-2 font-bold text-brand"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "2rem",
                    lineHeight: 1.2,
                    color: "541C2B",
                  }}
                >
                  {t.congrats}
                  {/* <TbSparkles size={30} className="shrink-0" /> */}
                  🎉
                </h2>
                <p className="mb-0.5 flex items-center justify-center gap-1.5 text-sm text-muted">
                  <TbGift size={16} className="shrink-0" />
                  {t.result}
                </p>
                <p
                  className="font-bold text-deep-gold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem" }}
                  data-testid="gift-result"
                >
                  {prize.label[lang]}
                </p>
              </>
            ) : (
              <p className="leading-loose text-muted">{t.intro}</p>
            )}
          </div>
          {result && retry ? (
            <button
              disabled={wheel.requesting || wheel.spinning}
              onClick={wheel.spin}
              className="mt-3 min-h-12 w-full rounded-lg bg-brand px-5 py-3 font-bold text-white"
            >
              {lang === "ar" ? "دوري العجلة مجددًا" : "Spin again"}
            </button>
          ) : result && wheel.award?.reference ? (
            <>
              <p className="mb-2 text-xs text-muted">{t.reference}</p>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line p-3">
                <code dir="ltr" className="min-w-0 select-all break-all text-sm">
                  {wheel.award.reference}
                </code>
                <button
                  title={t.copy}
                  aria-label={t.copy}
                  className="grid size-10 shrink-0 place-items-center rounded text-brand hover:bg-brand/5"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(wheel.award!.reference!);
                      setCopyState("copied");
                    } catch {
                      setCopyState("error");
                    }
                  }}
                >
                  {copyState === "copied" ? <TbCheck size={21} /> : <TbCopy size={21} />}
                </button>
              </div>
              <span className="min-h-6 text-xs text-muted" role="status">
                {copyState === "copied" ? t.copied : copyState === "error" ? t.copyError : ""}
              </span>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(claimText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-center text-white"
              >
                <TbBrandWhatsapp size={22} />
                {t.claim}
              </a>
            </>
          ) : (
            <>
              <div className="mt-4">
                <label htmlFor="gift-phone" className="mb-1.5 block text-sm font-medium text-muted">
                  {t.phoneLabel}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted">
                    <TbPhone size={18} />
                  </span>
                  <input
                    id="gift-phone"
                    type="tel"
                    dir="ltr"
                    value={wheel.phone}
                    onChange={(e) => {
                      wheel.setPhone(e.target.value);
                      if (phoneError && e.target.value.trim()) setPhoneError(false);
                    }}
                    placeholder={t.phonePlaceholder}
                    className={`w-full rounded-lg border py-3 ps-10 pe-4 text-sm outline-none transition-colors focus:border-brand ${
                      phoneError ? "border-red-400 bg-red-50" : "border-line bg-white"
                    }`}
                    disabled={wheel.spinning || wheel.requesting}
                    autoComplete="tel"
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {t.phoneRequired}
                  </p>
                )}
              </div>
              <button
                disabled={!wheel.ready || wheel.spinning || wheel.requesting}
                onClick={() => {
                  if (!wheel.phone.trim()) {
                    setPhoneError(true);
                    return;
                  }
                  setPhoneError(false);
                  wheel.spin();
                }}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
              >
                <TbGift size={22} />
                {wheel.requesting
                  ? lang === "ar"
                    ? "جارٍ تأكيد المشاركة…"
                    : "Confirming your entry…"
                  : wheel.spinning
                    ? t.spinning
                    : t.spin}
              </button>
            </>
          )}
          {wheel.error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {wheel.error}
            </p>
          )}
          <p className="mb-0 mt-5 text-xs leading-loose text-muted">{rewardsConfig.terms[lang]}</p>
          {!wheel.storageAvailable && <p className="mt-3 text-xs text-muted">{t.storage}</p>}
        </div>
      </div>
    </motion.dialog>
  );
}
