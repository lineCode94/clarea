"use client";

import { useEffect, useId, useState } from "react";
import { TbDownload, TbX } from "react-icons/tb";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallApp({ lang }: { lang: "ar" | "en" }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(240);
  const helpId = useId();
  const ar = lang === "ar";

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("clarea-install-dismissed") === "1";
    } catch {}
    const timer = window.setTimeout(() => setVisible(!dismissed), 5000);
    const header = document.querySelector("header.topbar");
    const position = () => setTop(Math.max(12, (header?.getBoundingClientRect().bottom ?? 0) + 10));
    position();
    const observer = new ResizeObserver(position);
    if (header) observer.observe(header);
    window.addEventListener("scroll", position, { passive: true });
    window.addEventListener("resize", position);
    const media = window.matchMedia("(display-mode: standalone)");
    const standalone = () =>
      setInstalled(
        media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    standalone();
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", standalone);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", position);
      window.removeEventListener("resize", position);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", standalone);
    };
  }, []);

  async function install() {
    if (!prompt) {
      setHelp(!help);
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setHelp(choice.outcome !== "accepted");
    } catch {
      setHelp(true);
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  function dismiss() {
    setVisible(false);
    setHelp(false);
    try {
      sessionStorage.setItem("clarea-install-dismissed", "1");
    } catch {}
  }

  if (installed || !visible) return null;
  return (
    <section
      aria-label={ar ? "تثبيت تطبيق Claréa" : "Install Claréa"}
      dir={ar ? "rtl" : "ltr"}
      style={{ top, maxHeight: `calc(100dvh - ${top + 96}px)` }}
      className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-[350px] -translate-x-1/2 overflow-y-auto rounded-2xl border border-brand/10 bg-white/95 p-3 text-brand shadow-[0_8px_36px_rgba(54,20,32,0.16)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <img
          src="/pwa/icon-192-logo-v3.png"
          alt=""
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-xl border border-brand/10"
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold">Claréa</p>
          <p className="m-0 mt-0.5 text-xs text-muted">{ar ? "أقرب لكِ بضغطة" : "One tap away"}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          aria-expanded={help}
          aria-controls={helpId}
          onClick={install}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#793448] disabled:opacity-60"
        >
          <TbDownload size={16} aria-hidden="true" />
          {ar ? "تثبيت التطبيق" : "Install app"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={ar ? "إغلاق اقتراح التثبيت" : "Dismiss install suggestion"}
          className="-me-1 grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-brand/5 hover:text-brand"
        >
          <TbX size={17} />
        </button>
      </div>
      {help && (
        <div
          id={helpId}
          role="status"
          className="mt-3 border-t border-brand/10 px-1 pt-3 text-xs leading-6 text-muted"
        >
          <p className="m-0">
            {ios
              ? ar
                ? "افتحي الموقع في Safari، ثم المشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة."
                : "Open this site in Safari, then Share → Add to Home Screen → Add."
              : ar
                ? "من قائمة Chrome ⋮، اختاري «إضافة إلى الشاشة الرئيسية» ثم «تثبيت»."
                : "In Chrome, open ⋮ → Add to Home screen → Install."}
          </p>
          {!ios && (
            <p className="mt-1 mb-0">
              {ar
                ? "استخدمي المتصفح مباشرة خارج وضع التصفح المتخفي."
                : "Use your browser directly, outside Incognito."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
