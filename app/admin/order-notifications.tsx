"use client";
import { useEffect, useRef, useState } from "react";
import { TbBell, TbVolume, TbVolumeOff } from "react-icons/tb";
type Notice = { count: number; orders: { reference: string; created_at: string }[] };
export default function OrderNotifications() {
  const [data, setData] = useState<Notice>({ count: 0, orders: [] }),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState(false),
    [sound, setSound] = useState(true),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const audio = useRef<AudioContext | null>(null),
    enabled = useRef(true),
    pending = useRef(false);
  async function playSound() {
    if (!enabled.current || !audio.current) return;
    try {
      await audio.current.resume();
      if (audio.current.state !== "running") return;
      setReady(true);
      if (!pending.current) return;
      pending.current = false;
      [660, 880, 1046].forEach((frequency, index) => {
        const ctx = audio.current!;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.18;
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
        oscillator.start(start); oscillator.stop(start + 0.46);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { setReady(false); }
  }
  function unlock() {
    if (!enabled.current) return;
    try { audio.current ||= new AudioContext(); void playSound(); } catch { setReady(false); }
  }
  useEffect(() => {
    try { enabled.current = localStorage.getItem("clarea-admin-sound") !== "off"; } catch {}
    setSound(enabled.current);
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);
  useEffect(() => {
    let stopped = false,
      busy = false;
    async function load() {
      if (busy) return;
      busy = true;
      try {
        const r = await fetch("/api/admin/order-notifications", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const d: Notice = await r.json();
        if (stopped) return;
        setData(d);
        setError(false);
        let seen: string[] = [];
        try {
          seen = JSON.parse(localStorage.getItem("clarea-admin-notified") || "[]");
          if (!Array.isArray(seen)) seen = [];
        } catch {}
        const fresh = d.orders.filter((o) => !seen.includes(o.reference));
        if (fresh.length) {
          setNotice(true);
          pending.current = true;
          void playSound();
        }
        try {
          localStorage.setItem(
            "clarea-admin-notified",
            JSON.stringify(
              [...new Set([...seen, ...d.orders.map((o) => o.reference)])].slice(-500),
            ),
          );
        } catch {}
      } catch {
        if (!stopped) setError(true);
      } finally {
        busy = false;
      }
    }
    void load();
    const timer = setInterval(load, 30000);
    document.addEventListener("visibilitychange", load);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
      audio.current = null;
    },
    [],
  );
  return (
    <div dir="rtl" className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-32px)] text-[#412832]">
      {(open || notice) && (
        <section
          aria-label="تنبيهات الطلبات"
          className="mb-3 w-80 max-w-full rounded-2xl border border-[#e5d7cd] bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <strong>{data.count ? "طلبات جديدة تحتاج تأكيدك" : "تنبيهات الطلبات"}</strong>
            <button
              aria-label="إغلاق التنبيهات"
              className="size-10"
              onClick={() => {
                setOpen(false);
                setNotice(false);
              }}
            >
              ×
            </button>
          </div>
          <p role="status" className="text-sm">
            {error
              ? "تعذر تحديث التنبيهات. هنحاول مجدداً."
              : data.count
                ? data.count + " طلب بانتظار التأكيد"
                : "لا توجد طلبات جديدة"}
          </p>
          <ul className="max-h-52 list-none space-y-2 overflow-auto p-0">
            {data.orders.slice(0, 10).map((o) => (
              <li key={o.reference}>
                <a
                  href={"/admin/orders?q=" + encodeURIComponent(o.reference)}
                  className="block rounded-lg bg-[#F5E9E2]/50 p-3 text-sm"
                >
                  <bdi>{o.reference}</bdi> · عرض الطلب
                </a>
              </li>
            ))}
          </ul>
          <button
            className="flex min-h-11 items-center gap-2 text-sm"
            onClick={() => {
              const next = !sound || !ready;
              enabled.current = next;
              setSound(next);
              try { localStorage.setItem("clarea-admin-sound", next ? "on" : "off"); } catch {}
              if (next) { pending.current = true; unlock(); }
              else { pending.current = false; }
            }}
          >
            {sound ? <TbVolume /> : <TbVolumeOff />}
            {sound && ready ? "الصوت شغال · إيقاف الصوت" : "تفعيل وتجربة صوت التنبيه"}
          </button>
          <p className="mb-0 text-xs text-[#917c73]">التحديث كل 30 ثانية. التنبيه يعمل طالما لوحة الإدارة مفتوحة؛ قد يؤخر المتصفح التحديث في الخلفية.</p>
        </section>
      )}
      {sound && !ready && <button onClick={() => { pending.current = true; unlock(); }} className="mb-2 block rounded-xl border border-[#C9A05C] bg-white px-4 py-2 text-sm shadow">اضغط لتفعيل صوت الطلبات 🔔</button>}
      <button
        onClick={() => {
          setOpen(!open);
          setNotice(false);
        }}
        aria-label={"تنبيهات الطلبات: " + data.count}
        aria-expanded={open || notice}
        className="flex min-h-12 items-center gap-2 rounded-full bg-[#5C1A2B] px-4 py-3 text-white shadow-lg"
      >
        <TbBell size={22} />
        <span>{data.count}</span>
      </button>
    </div>
  );
}
