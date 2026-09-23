"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TbUser, TbX } from "react-icons/tb";
import { orderNeedsAttention, setOrderAttention } from "../../lib/recent-orders";
import type { Language } from "../../types/catalog";

export default function AccountLink({ lang }: { lang: Language }) {
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  const [unread, setUnread] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const refresh = () => { setUnread(orderNeedsAttention()); setDismissed(false); };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("clarea-order-attention", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("clarea-order-attention", refresh);
    };
  }, []);
  return <div className="relative">
    <a href="/account" onClick={() => setOrderAttention(false)}
      aria-label={ar ? "طلباتي" : "My orders"}
      aria-describedby={unread && !dismissed ? "order-follow-tip" : undefined}
      className="relative grid size-10 place-items-center rounded-full text-[#5C1A2B] hover:bg-[#F5E9E2] focus-visible:outline-[#C9A05C] sm:size-11">
      {unread && <motion.span aria-hidden="true" data-order-glow
        className="pointer-events-none absolute inset-0 rounded-full bg-[#C9A05C]/15 ring-1 ring-[#C9A05C]/50"
        animate={reduced ? { opacity: 1 } : { boxShadow: ["0 0 0 0 #C9A05C00", "0 0 16px 4px #C9A05C55", "0 0 0 0 #C9A05C00"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />}
      <TbUser size={23} className="relative" />
      {unread && <span className="sr-only">{ar ? "طلب جديد للمتابعة" : "New order to track"}</span>}
    </a>
    {unread && !dismissed && <div id="order-follow-tip" role="status" dir={ar ? "rtl" : "ltr"}
      className="absolute right-0 top-full z-40 mt-3 flex w-52 items-center gap-2 rounded-xl border border-[#C9A05C]/40 bg-[#fffaf5] p-3 text-xs text-[#5C1A2B] shadow-lg">
      <a href="/account" onClick={() => setOrderAttention(false)} className="flex-1 font-semibold">{ar ? "تابعي طلبك من هنا" : "Track your order here"}</a>
      <button type="button" aria-label={ar ? "إخفاء التلميح" : "Dismiss tip"} onClick={() => setDismissed(true)} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-[#F5E9E2]"><TbX size={15} /></button>
    </div>}
  </div>;
}
