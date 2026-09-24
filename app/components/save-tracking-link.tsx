"use client";
import { useState } from "react";
export default function SaveTrackingLink({ path, ar }: { path: string; ar: boolean }) {
  const [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState("");
  async function copy() {
    const url = window.location.origin + path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFallback(url);
    }
  }
  return (
    <div className="rounded-xl border border-[#e9ddd5] bg-[#fffaf6] p-4 text-sm text-[#5C1A2B]">
      <p className="mt-0">
        {ar
          ? "متابعة بدون حساب. احفظي الرابط الخاص؛ تقدري تفتحيه من أي جهاز. طلبك محفوظ أيضاً في «طلباتي» على هذا المتصفح."
          : "No account needed. Save your private link to track from any device. This browser also remembers it in My orders."}
      </p>
      <button type="button" onClick={copy} className="min-h-11 rounded-lg border px-4 font-bold">
        {copied
          ? ar
            ? "تم نسخ الرابط ✓"
            : "Link copied ✓"
          : ar
            ? "نسخ رابط المتابعة"
            : "Copy tracking link"}
      </button>
      {fallback && (
        <input
          aria-label={ar ? "رابط المتابعة الخاص" : "Private tracking link"}
          className="mt-2 w-full rounded border p-2"
          dir="ltr"
          readOnly
          value={fallback}
          onFocus={(e) => e.target.select()}
        />
      )}
      <p className="mb-0 text-xs">
        {ar
          ? "الرابط خاص بطلبك؛ شاركيه فقط مع شخص تثقين به."
          : "This link is private. Only share it with someone you trust."}
      </p>
    </div>
  );
}
