"use client";
import { TbRefresh } from "react-icons/tb";
type Item = { id: string; label: string; href?: string; onClick?: () => void };
export default function AdminToolbar({
  items,
  active,
  busy,
  onRefresh,
}: {
  items: Item[];
  active: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  const itemClass = (id: string) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-colors sm:flex-none ${active === id ? "bg-[#5c1a2b] text-white shadow-sm" : "text-[#80656e] hover:bg-white hover:text-[#5c1a2b]"}`;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8ddd5] bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
      {items.length > 0 && (
        <nav aria-label="صفحات القسم" className="flex gap-1 rounded-xl bg-[#f8f3ef] p-1">
          {items.map((item) =>
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                aria-current={active === item.id ? "page" : undefined}
                aria-disabled={busy}
                onClick={(e) => {
                  if (busy || active === item.id) e.preventDefault();
                }}
                className={itemClass(item.id)}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                aria-pressed={active === item.id}
                onClick={item.onClick}
                className={itemClass(item.id)}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onRefresh}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-[#80656e] hover:bg-[#f8f3ef] disabled:opacity-50"
      >
        <TbRefresh size={19} className={busy ? "animate-spin" : ""} />
        {busy ? "جارٍ التحديث…" : "تحديث البيانات"}
      </button>
    </div>
  );
}
