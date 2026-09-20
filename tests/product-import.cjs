const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = process.env.TEST_SOURCE_ROOT || path.resolve(__dirname, ".."),
  ts = require(path.join(root, "node_modules/typescript")),
  cache = {};
function load(file) {
  const full = path.resolve(root, file);
  if (cache[full]) return cache[full].exports;
  const m = { exports: {} };
  cache[full] = m;
  const js = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    exports: m.exports,
    require: (n) =>
      n.startsWith(".")
        ? load(path.resolve(path.dirname(full), n + ".ts"))
        : require(path.join(root, "node_modules", n)),
    Date,
    Math,
  });
  return m.exports;
}
const { managedProductSchema } = load("app/lib/catalog-schema.ts");
const data = JSON.parse(fs.readFileSync(path.join(root, "content-imports/products-20260920.json"))),
  audit = JSON.parse(fs.readFileSync(path.join(root, "content-imports/sources-20260920.json")));
assert.equal(data.length, 61);
assert.equal(new Set(data.map((p) => p.id)).size, 61);
assert.equal(audit.filter((p) => p.action === "existing-no-change").length, 1);
for (let n = 1; n <= 60; n++)
  assert(
    audit.some((p) => p.photos.includes(n)),
    "Missing photo " + n,
  );
for (const p of data) {
  assert(managedProductSchema.safeParse(p).success, "Invalid " + p.id);
  assert(p.available && p.published);
  assert(p.description.ar && p.description.en);
  assert(!("pricing" in p) && !("stock" in p));
  for (const image of p.images) {
    assert(image.startsWith("/products/import-20260920/"));
    assert(fs.existsSync(path.join(root, "public", image)));
  }
  assert(audit.find((s) => s.id === p.id)?.imageUrl?.startsWith("https://"));
}
for (const c of ["oral", "drinks"]) assert(data.some((p) => p.category === c));
console.log(
  "PASS product import: 60 photos mapped, 61 unique new products, one existing product skipped, valid categories, bilingual copy, sourced local images and no invented prices/quantities.",
);
