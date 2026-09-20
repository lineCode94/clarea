"use client";

import { useRef } from "react";
import {
  TbMenu2,
  TbX,
  TbPackage,
  TbCheck,
  TbFileText,
  TbPlus,
  TbArrowUpRight,
} from "react-icons/tb";

export const adminExtraPaths = {
  pricing: "/admin/pricing",
  reports: "/admin/reports",
  supplier: "/admin/supplier",
  "new-order": "/admin/orders/new",
};
export type AdminView =
  | "all"
  | "published"
  | "draft"
  | "new"
  | "codes"
  | "inventory"
  | "orders"
  | keyof typeof adminExtraPaths;
type Props = { active: AdminView; onNavigate: (view: AdminView) => boolean; disabled: boolean };

export default function AdminSidebar({ active, onNavigate, disabled }: Props) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = [
    { id: "all", label: "كل المنتجات", Icon: TbPackage },
    { id: "published", label: "المنتجات المنشورة", Icon: TbCheck },
    { id: "draft", label: "المسودات", Icon: TbFileText },
    { id: "new", label: "إضافة منتج", Icon: TbPlus },
    { id: "new-order", label: "إدخال طلب جديد", Icon: TbPlus },
    { id: "orders", label: "سجل الطلبات", Icon: TbPackage },
    { id: "inventory", label: "المخزون", Icon: TbPackage },
    { id: "pricing", label: "الأسعار والخصومات", Icon: TbFileText },
    { id: "reports", label: "التقارير والمبيعات", Icon: TbFileText },
    { id: "supplier", label: "حساب المورد", Icon: TbFileText },
    { id: "codes", label: "فحص أكواد الهدايا", Icon: TbCheck },
  ] as const;
  function close() {
    drawer.current?.close();
  }
  const content = (
    <>
      <div className="mb-10 flex items-center gap-3 border-b border-[#e8ddd5] pb-6">
        <img src="/pwa/icon-192-logo-v3.png" alt="Claréa" className="size-12 rounded-xl" />
        <div>
          <p className="m-0 font-serif text-xl">Claréa</p>
          <p className="m-0 mt-1 text-xs text-[#917c73]">لوحة الإدارة</p>
        </div>
      </div>
      <p className="mb-3 px-3 text-xs text-[#917c73]">إدارة المتجر</p>
      <nav aria-label="التنقل في الإدارة" className="grid gap-2">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-current={active === id ? "page" : undefined}
            onClick={() => {
              if (onNavigate(id)) close();
            }}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-right text-sm transition-colors disabled:opacity-50 ${active === id ? "bg-[#5C1A2B] font-bold text-white" : "text-[#644950] hover:bg-[#f5ece7]"}`}
          >
            <Icon size={21} />
            {label}
          </button>
        ))}
      </nav>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="mt-8 flex min-h-12 items-center gap-3 border-t border-[#e8ddd5] px-4 pt-5 text-sm text-[#917c73]"
      >
        <TbArrowUpRight size={20} />
        عرض المتجر
      </a>
    </>
  );
  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 overflow-y-auto border-l border-[#e8ddd5] bg-[#fffdf9] p-5 lg:block">
        {content}
      </aside>
      <button
        ref={trigger}
        type="button"
        aria-label="فتح قائمة الإدارة"
        onClick={() => drawer.current?.showModal()}
        className="fixed right-3 top-5 z-40 grid size-11 place-items-center rounded-xl border border-[#e8ddd5] bg-white text-[#5C1A2B] shadow-sm lg:hidden"
      >
        <TbMenu2 size={23} />
      </button>
      <dialog
        ref={drawer}
        aria-label="قائمة الإدارة"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => trigger.current?.focus()}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-72 max-w-[88vw] border-0 bg-[#fffdf9] p-0 text-[#412832] shadow-2xl backdrop:bg-black/35"
      >
        <div className="min-h-full p-5" dir="rtl">
          <button
            type="button"
            aria-label="إغلاق قائمة الإدارة"
            onClick={close}
            className="mb-5 mr-auto grid size-11 place-items-center rounded-xl bg-[#f5ece7]"
          >
            <TbX size={22} />
          </button>
          {content}
        </div>
      </dialog>
    </>
  );
}
