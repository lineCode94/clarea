"use client";
import { useEffect, useState } from "react";
import { dayInCairo } from "../../lib/inventory-schema";
import type { SupplierReport } from "../../lib/supplier-report";
const money = (n: number) =>
  new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
export default function SupplierPanel() {
  const [period, setPeriod] = useState("monthly"),
    [date, setDate] = useState(() => dayInCairo(new Date().toISOString())),
    [report, setReport] = useState<SupplierReport | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReport(null);
    setError("");
    fetch(`/api/admin/reports/supplier?period=${period}&date=${date}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error || "تعذر تحميل التقرير");
        return b;
      })
      .then(setReport)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [period, date, refresh]);
  function download() {
    if (!report) return;
    const cell = (v: string | number) =>
      '"' +
      String(v)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const rows = [
      ["Claréa — كشف حساب المورد"],
      ["من", report.from, "إلى", report.to],
      [
        "الصنف",
        "كود الصنف",
        "الكمية",
        "سعر الشراء للوحدة (ج.م)",
        "الإجمالي (ج.م)",
        "أرقام الطلبات",
      ],
      ...report.rows.map((r) => [
        r.name,
        r.product_id,
        r.quantity,
        r.unit_cost,
        r.total,
        r.references.join(" / "),
      ]),
      ["الإجمالي", "", report.quantity, "", report.total],
      ["المبالغ تخص مبيعات الفترة قبل خصم أي دفعات سابقة للمورد"],
    ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clarea-supplier-${report.from}-${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="supplier-panel rounded-2xl border border-[#e8ddd5] bg-white p-4 sm:p-7">
      <style>{`@media print {body *{visibility:hidden!important}.supplier-print,.supplier-print *{visibility:visible!important}.supplier-print{position:absolute!important;inset:0!important;width:100%!important;padding:20px!important;background:white!important;color:black!important}.supplier-print table{font-size:11px!important}.supplier-print tr{break-inside:avoid}.supplier-print thead{display:table-header-group}.supplier-print .table-scroll{overflow:visible!important}}`}</style>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label>
          الفترة
          <select
            className="mt-2 block rounded-xl border p-3"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="monthly">شهري</option>
            <option value="weekly">أسبوعي (السبت — الجمعة)</option>
          </select>
        </label>
        <label>
          تاريخ داخل الفترة
          <input
            aria-label="تاريخ تقرير المورد"
            type="date"
            className="mt-2 block rounded-xl border p-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button className="rounded-xl border px-4 py-3" onClick={() => setRefresh((n) => n + 1)}>
          تحديث التقرير
        </button>
        <button
          disabled={!report}
          className="rounded-xl bg-[#5c1a2b] px-4 py-3 text-white disabled:opacity-40"
          onClick={() => window.print()}
        >
          طباعة / حفظ PDF
        </button>
        <button
          disabled={!report}
          className="rounded-xl border px-4 py-3 disabled:opacity-40"
          onClick={download}
        >
          تنزيل Excel (CSV)
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : !report ? (
        <p role="status">جارٍ تجهيز حساب المورد…</p>
      ) : (
        <div className="supplier-print" dir="rtl">
          <div className="flex items-center gap-4 border-b border-[#e8ddd5] pb-5">
            <img src="/pwa/icon-192-logo-v3.png" alt="Claréa" width={64} height={64} />
            <div>
              <h2 className="m-0 text-2xl">كشف حساب المورد</h2>
              <p className="mb-0 text-sm">
                Claréa · {report.from} — {report.to} · بتوقيت القاهرة
              </p>
            </div>
          </div>
          <p className="text-sm leading-7">
            الطلبات التي تم تسليمها والمبيعات المسجلة خلال الفترة، بسعر الشراء المحفوظ للعملية. إذا
            تغير سعر شراء الصنف يظهر في أكثر من سطر. يشمل التقرير كل الفئات.
          </p>
          <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["عدد الطلبات", report.orders],
              ["القطع المباعة", report.quantity],
              ["إجمالي حساب المورد", money(report.total) + " ج.م"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#f8f5f1] p-4">
                <p className="m-0 text-sm">{label}</p>
                <p className="mb-0 mt-2 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-right text-sm">
              <thead>
                <tr className="bg-[#5c1a2b] text-white">
                  {["الصنف", "الكمية", "سعر الشراء / وحدة", "الإجمالي (ج.م)", "أرقام الطلبات"].map(
                    (t) => (
                      <th key={t} className="p-3">
                        {t}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.product_id + ":" + r.unit_cost} className="border-b border-[#e8ddd5]">
                    <td className="min-w-40 p-3">
                      <strong>{r.name}</strong>
                      <div className="mt-1 text-xs text-[#806b63]">{r.product_id}</div>
                    </td>
                    <td className="p-3">{r.quantity}</td>
                    <td className="p-3">{money(r.unit_cost)}</td>
                    <td className="p-3">{money(r.total)}</td>
                    <td className="p-3">
                      <span className="break-words">{r.references.join(" / ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f8f5f1] font-bold">
                  <td className="p-3">الإجمالي</td>
                  <td className="p-3">{report.quantity}</td>
                  <td />
                  <td className="p-3">{money(report.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {!report.rows.length && (
            <p className="py-6 text-center">لا توجد مبيعات تم تسليمها خلال هذه الفترة.</p>
          )}
          <p className="mt-6 border-t pt-4 text-sm text-[#806b63]">
            هذا كشف بقيمة الأصناف المباعة خلال الفترة قبل خصم أي مبالغ سبق سدادها للمورد. لا يتضمن
            سعر البيع للعميل أو الأرباح.
          </p>
        </div>
      )}
    </section>
  );
}
