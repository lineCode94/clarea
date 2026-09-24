const fs = require("fs"),
  vm = require("vm"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
function load(file, requireFn) {
  const m = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    { exports: m.exports, module: m, require: requireFn },
  );
  return m.exports;
}
const search = load("app/lib/admin-search.ts", () => {});
const config = load("app/config/home-collections.ts", () => {});
const p = (id, name, category, price, rank) => ({
  id,
  name,
  brand: "Arencia",
  category,
  public_price: price,
  best_seller_rank: rank,
  available: true,
  label: { ar: "غسول الأرز", en: name },
});
const products = [
  p("a", "Rice Cleanser", "skin", 100, 0),
  p(config.popularProductIds[0], "Serum", "skin", 200),
  p("c", "Shampoo", "hair", undefined),
];
let state = [],
  i = 0;
const hook = load("app/hooks/use-catalog-filters.ts", (id) =>
  id === "react"
    ? {
        useState: (d) => {
          const n = i++;
          return [state[n] ?? d, (v) => (state[n] = v)];
        },
        useMemo: (f) => f(),
      }
    : id.includes("admin-search")
      ? search
      : id.includes("home-collections")
        ? config
        : { useProducts: () => products },
);
function run(values) {
  state = values;
  i = 0;
  return hook.useCatalogFilters("en");
}
assert.equal(run(["all", "arenceia rice"]).filtered.length, 1);
assert.equal(run(["all", "أرز"]).filtered.length, 3);
assert.equal(run(["hair", ""]).filtered[0].id, "c");
assert.deepEqual(
  Array.from(run(["all", "", false, "best-selling"]).filtered, (p) => p.id),
  ["a", config.popularProductIds[0], "c"],
);
assert.deepEqual(
  Array.from(run(["all", "", false, "price-high-low"]).filtered, (p) => p.id),
  [config.popularProductIds[0], "a", "c"],
);
const f = run(["hair", "shampoo", true, "az"]);
f.reset();
assert.deepEqual(state, ["all", "", false, "featured"]);
console.log("PASS catalog: bilingual and typo search, category, best sellers, prices and reset");
