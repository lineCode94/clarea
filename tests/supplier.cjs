const fs = require("fs"),
  vm = require("vm"),
  path = require("path"),
  assert = require("assert/strict"),
  ts = require("typescript");
const cache = {};
function load(file) {
  file = path.resolve(__dirname, "..", file);
  if (cache[file]) return cache[file];
  const m = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports: m.exports,
      require: (n) =>
        n.startsWith(".") ? load(path.resolve(path.dirname(file), n + ".ts")) : require(n),
      URLSearchParams,
      Intl,
      Date,
    },
  );
  return (cache[file] = m.exports);
}
const { supplierReport } = load("app/lib/supplier-report.ts"),
  { matchesAdminProduct } = load("app/lib/admin-search.ts");
const sale = (id, qty, cost, date, ref) => ({
  product_id: id,
  name: id,
  quantity_sold: qty,
  cost_price: cost,
  date,
  order_reference: ref,
});
const sales = [
  sale("toner", 2, 1300, "2026-09-19T12:00:00Z", "CL-1"),
  sale("serum", 3, 100.25, "2026-09-19T12:00:00Z", "CL-1"),
  sale("toner", 1, 1400, "2026-09-20T12:00:00Z", "CL-2"),
  sale("old", 1, 10, "2026-09-18T20:59:00Z", "CL-0"),
  sale("boundary", 1, 20, "2026-09-25T21:00:00Z", "CL-3"),
];
let r = supplierReport(sales, new URLSearchParams("period=weekly&date=2026-09-20"));
assert.equal(r.from, "2026-09-19");
assert.equal(r.to, "2026-09-25");
assert.equal(r.total, 4300.75);
assert.equal(r.quantity, 6);
assert.equal(r.orders, 2);
assert.equal(r.rows.length, 3);
r = supplierReport(sales, new URLSearchParams("period=monthly&date=2026-09-20"));
assert.equal(r.total, 4330.75);
assert.equal(r.to, "2026-09-30");
assert.equal(supplierReport([], new URLSearchParams("date=2028-02-12")).to, "2028-02-29");
assert.throws(() => supplierReport([], new URLSearchParams("date=2026-02-30")));
assert.equal(supplierReport([], new URLSearchParams()).total, 0);
const p = {
  id: "arencia-cleanser",
  name: "Rice Cake Cleanser",
  brand: "ARENCIA",
  label: { ar: "غسول", en: "Cleanser" },
};
for (const q of ["arencia", "arenceia", "  ARENCIA  ", "arencia cleanser", "غسول"])
  assert(matchesAdminProduct(p, q), q);
assert(!matchesAdminProduct(p, "panoxyl"));
assert(!matchesAdminProduct(p, "arencia serum"));
console.log(
  "PASS supplier: Cairo boundaries, weekly/monthly/leap dates, multiple products/order, changed cost, integer cents, empty reports and brand/typo search",
);
