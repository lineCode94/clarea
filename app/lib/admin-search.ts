// Shared admin search: brand, product ID and labels, with conservative typo tolerance.
function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F]/g, "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
export function matchesAdminProduct(
  p: { name: string; id?: string; brand?: string; label?: { ar: string; en: string } },
  query: string,
) {
  const words = normalize(
    [p.name, p.brand, p.id, p.label?.ar, p.label?.en].filter(Boolean).join(" "),
  ).split(" ");
  return normalize(query)
    .split(" ")
    .filter(Boolean)
    .every((q) =>
      words.some(
        (w) =>
          w.includes(q) ||
          (q.length >= 5 && Math.abs(w.length - q.length) <= 1 && distance(w, q) <= 1),
      ),
    );
}
