"use client";

import { useRef, useState, useEffect } from "react";
import {
  TbMenu2,
  TbChevronDown,
  TbX,
  TbPackage,
  TbCheck,
  TbFileText,
  TbPlus,
  TbArrowUpRight,
  TbShoppingCartPlus,
  TbClipboardList,
  TbBuildingWarehouse,
  TbTags,
  TbChartBar,
  TbReceipt,
  TbGift,
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
    { id: "new-order", label: "إدخال طلب جديد", Icon: TbShoppingCartPlus },
    { id: "orders", label: "سجل الطلبات", Icon: TbClipboardList },
    { id: "inventory", label: "المخزون", Icon: TbBuildingWarehouse },
    { id: "pricing", label: "الأسعار والخصومات", Icon: TbTags },
    { id: "reports", label: "التقارير والمبيعات", Icon: TbChartBar },
    { id: "supplier", label: "حساب المورد", Icon: TbReceipt },
    { id: "codes", label: "فحص أكواد الهدايا", Icon: TbGift },
  ] as const;
  const groups = [
    {
      id: "orders",
      label: "الطلبات",
      Icon: TbClipboardList,
      views: ["new-order", "orders", "codes"],
    },
    {
      id: "products",
      label: "المنتجات",
      Icon: TbPackage,
      views: ["all", "published", "draft", "new"],
    },
    {
      id: "stock",
      label: "المخزون والأسعار",
      Icon: TbBuildingWarehouse,
      views: ["inventory", "pricing"],
    },
    {
      id: "accounts",
      label: "التقارير والحسابات",
      Icon: TbChartBar,
      views: ["reports", "supplier"],
    },
  ];
  const currentGroup = groups.find((g) => g.views.includes(active))!.id;
  const [openGroups, setOpenGroups] = useState<string[]>([currentGroup]);
  useEffect(() => {
    setOpenGroups((old) => (old.includes(currentGroup) ? old : [...old, currentGroup]));
  }, [currentGroup]);
  function close() {
    drawer.current?.close();
  }
  const content = (
    <>
      <div className="mb-5 flex items-center gap-3 border-b border-[#e8ddd5] pb-6">
        <img src="/pwa/icon-192-logo-v3.png" alt="Claréa" className="size-12 rounded-xl" />
        <div>
          <p className="m-0 font-serif text-xl">Claréa</p>
          <p className="m-0 mt-1 text-xs text-[#917c73]">لوحة الإدارة</p>
        </div>
      </div>
      <p className="mb-3 px-3 text-xs text-[#917c73]">إدارة المتجر</p>
      <nav aria-label="التنقل في الإدارة" className="grid gap-2">
        {groups.map((group) => {
          const open = openGroups.includes(group.id);
          return (
            <section key={group.id} className="rounded-xl">
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setOpenGroups((old) =>
                    open ? old.filter((id) => id !== group.id) : [...old, group.id],
                  )
                }
                className={
                  "flex min-h-12 w-full items-center gap-2 rounded-xl px-3 py-3 text-right text-sm font-bold transition-colors " +
                  (currentGroup === group.id
                    ? "bg-[#f5ece7] text-[#5c1a2b]"
                    : "text-[#644950] hover:bg-[#f5ece7]")
                }
              >
                <group.Icon size={21} />
                <span className="flex-1">{group.label}</span>
                <TbChevronDown
                  size={17}
                  className={"transition-transform " + (open ? "rotate-180" : "")}
                />
              </button>
              {open && (
                <div className="mr-5 mt-1 grid gap-1 border-r border-[#e8ddd5] pr-2 pb-2">
                  {group.views.map((view) => {
                    const item = items.find((item) => item.id === view)!;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        aria-current={active === item.id ? "page" : undefined}
                        onClick={() => {
                          if (active === item.id) {
                            close();
                            return;
                          }
                          if (onNavigate(item.id)) close();
                        }}
                        className={
                          "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-right text-xs leading-5 transition-colors disabled:opacity-50 " +
                          (active === item.id
                            ? "bg-[#5c1a2b] font-bold text-white"
                            : "text-[#80656e] hover:bg-[#f5ece7]")
                        }
                      >
                        <item.Icon size={18} className="shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
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
