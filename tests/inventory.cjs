const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = process.env.TEST_SOURCE_ROOT || path.resolve(__dirname, ".."),
  ts = require(path.join(root, "node_modules/typescript")),
  z = require(path.join(root, "node_modules/zod"));
let stored = null,
  etag = 0,
  authorized = true,
  invalidations = 0,
  forceConflict = false;
class Precondition extends Error {}
const modules = {};
const nextResponse = {
  json: (body, options = {}) => ({
    body,
    status: options.status || 200,
    headers: options.headers,
  }),
};
const blob = {
  get: async () =>
    stored
      ? {
          statusCode: 200,
          stream: JSON.stringify(stored),
          blob: { etag: `W/"${etag}"` },
        }
      : null,
  put: async (key, text, options) => {
    if (forceConflict) {
      forceConflict = false;
      throw new Precondition();
    }
    if ((stored && !options.allowOverwrite) || (stored && options.ifMatch !== `"${etag}"`))
      throw new Precondition();
    stored = JSON.parse(text);
    etag++;
    return { etag: `"${etag}"` };
  },
  BlobPreconditionFailedError: Precondition,
};
class AdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const auth = {
  AdminError,
  requireAdmin: async () => {
    if (!authorized) throw new AdminError("unauthorized", 401);
  },
  sameOrigin: (r) => {
    if (r.headers.get("origin") !== new URL(r.url).origin) throw new AdminError("origin", 403);
  },
  limitedJson: async (r) => r.json(),
};
const product = {
  id: "sample",
  name: "Sample",
  brand: "Test",
  category: "skin",
  available: true,
  published: true,
  newArrival: false,
  images: ["/test.png"],
  tone: "#ffffff",
  label: { ar: "ع", en: "x" },
  description: { ar: "وصف", en: "Description" },
};
function load(file) {
  const full = path.resolve(root, file);
  if (modules[full]) return modules[full].exports;
  const m = { exports: {} };
  modules[full] = m;
  const source = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports: m.exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "zod") return z;
      if (name === "@vercel/blob") return blob;
      if (name === "next/cache")
        return {
          unstable_cache: (fn) => fn,
          revalidateTag: () => invalidations++,
        };
      if (name === "next/server") return { NextResponse: nextResponse };
      if (name.endsWith("/admin-auth") || name === "./admin-auth") return auth;
      if (name === "../data/products")
        return {
          products: [product, { ...product, id: "draft", published: false }],
        };
      if (name === "../config/home-collections") return { homeCollections: { newArrivals: [] } };
      if (name.startsWith("."))
        return load(path.relative(root, path.resolve(path.dirname(full), name + ".ts")));
      return require(name);
    },
    process: { env: { CATALOG_NAMESPACE: "unit-test" } },
    Response,
    Request,
    URL,
    console,
    Buffer,
    Intl,
    Date,
  });
  return m.exports;
}
const schema = load("app/lib/inventory-schema.ts"),
  store = load("app/lib/catalog-store.ts"),
  service = load("app/lib/inventory-service.ts");
function req(body, pathname = "/api/admin/sales", origin = "https://test.local") {
  return new Request("https://test.local" + pathname, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const get = (path) => new Request("https://test.local" + path);
(async () => {
  let c = await store.readCatalog();
  c.products = c.products.map((p) => ({ ...p, published: p.id !== "draft" }));
  await store.saveCatalog(c.products, c.version, c);
  assert.equal((await store.publicCatalog()).length, 1);
  assert.equal((await service.inventoryGet()).body.products[0].stock, null);
  authorized = false;
  assert.equal((await service.inventoryGet()).status, 401);
  assert.equal(
    (await service.updateInventory(req({ quantity: 1, min_stock_alert: 1 }), "sample", "stock"))
      .status,
    401,
  );
  assert.equal((await service.recordSale(req({}))).status, 401);
  for (const report of [
    "monthly-profit",
    "daily-summary",
    "profit-margins",
    "best-sellers",
    "low-stock",
  ])
    assert.equal((await service.report(get("/?month=2026-09"), report)).status, 401);
  authorized = true;
  assert.equal(
    (await service.updateInventory(req({}, "/", "https://evil.test"), "sample", "stock")).status,
    403,
  );
  assert.equal(
    (await service.updateInventory(req({ quantity: -1, min_stock_alert: 1 }), "sample", "stock"))
      .status,
    400,
  );
  assert.equal(
    (await service.updateInventory(req({ quantity: 1.5, min_stock_alert: 1 }), "sample", "stock"))
      .status,
    400,
  );
  assert.equal(
    (
      await service.updateInventory(
        req({ quantity: 1, min_stock_alert: 1, status: "coming_soon" }),
        "sample",
        "stock",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await service.updateInventory(
        req({ quantity: 0, min_stock_alert: 2, status: "coming_soon" }),
        "sample",
        "stock",
      )
    ).status,
    200,
  );
  assert.equal((await store.publicCatalog())[0].stock_status, "coming_soon");
  await service.updateInventory(req({ quantity: 3, min_stock_alert: 2 }), "sample", "stock");
  assert.equal(
    (
      await service.updateInventory(
        req({ cost_price: 100, selling_price: 250, discount: 101 }),
        "sample",
        "pricing",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await service.updateInventory(
        req({ cost_price: 100, selling_price: 250, discount: 10 }),
        "sample",
        "pricing",
      )
    ).status,
    200,
  );
  const f = schema.figures({
    cost_price: 100,
    selling_price: 250,
    discount: 10,
  });
  assert.equal(f.profit_per_unit, 125);
  assert.equal(f.profit_margin, 125);
  assert.equal(f.sales_margin, 55.56);
  assert.equal(
    schema.figures({ cost_price: 0, selling_price: 0, discount: 0 }).profit_margin,
    null,
  );
  let pub = JSON.stringify(await store.publicCatalog());
  for (const secret of [
    "cost_price",
    "selling_price",
    "profit",
    "quantity",
    "priceHistory",
    "sales",
  ])
    assert(!pub.includes(secret), secret);
  let input = {
    product_id: "sample",
    quantity_sold: 2,
    request_id: crypto.randomUUID(),
    order_reference: "ORDER-1",
  };
  let sale = await service.recordSale(req(input));
  assert.equal(sale.status, 200);
  assert.equal(sale.body.stock_remaining, 1);
  assert.equal(sale.body.profit_from_sale, 250);
  assert.equal((await service.recordSale(req(input))).body.duplicate, true);
  assert.equal(
    (await service.recordSale(req({ ...input, request_id: crypto.randomUUID() }))).status,
    409,
  );
  assert.equal((await service.recordSale(req({ ...input, quantity_sold: 1 }))).status, 409);
  assert.equal(
    (
      await service.recordSale(
        req({
          ...input,
          request_id: crypto.randomUUID(),
          order_reference: "ORDER-2",
        }),
      )
    ).status,
    409,
  );
  assert.equal((await service.report(get("/"), "low-stock")).body.length, 1);
  await service.updateInventory(
    req({ cost_price: 150, selling_price: 300, discount: 0 }),
    "sample",
    "pricing",
  );
  c = await store.readCatalog();
  assert.equal(c.sales[0].cost_price, 100);
  assert.equal(c.sales[0].selling_price, 225);
  assert.equal(c.priceHistory.length, 2);
  assert.equal(c.priceHistory[1].old_pricing.cost_price, 100);
  // A stale editor must fail; an ordinary catalog edit must preserve all financial history.
  const oldVersion = c.version;
  await store.saveCatalog(c.products, c.version);
  assert.equal((await store.readCatalog()).sales.length, 1);
  assert.equal(
    (
      await service.updateInventory(
        req({ quantity: 100, min_stock_alert: 1, version: oldVersion }),
        "sample",
        "stock",
      )
    ).status,
    409,
  );
  // Failed CAS must neither record a sale nor decrement quantity.
  forceConflict = true;
  let second = {
    ...input,
    quantity_sold: 1,
    request_id: crypto.randomUUID(),
    order_reference: "ORDER-2",
  };
  assert.equal((await service.recordSale(req(second))).status, 409);
  c = await store.readCatalog();
  assert.equal(c.inventory.sample.stock.quantity, 1);
  assert.equal(c.sales.length, 1);
  // Two concurrent buyers compete for the last unit: only one commit can succeed.
  const results = await Promise.all([
    service.recordSale(req(second)),
    service.recordSale(
      req({
        ...second,
        request_id: crypto.randomUUID(),
        order_reference: "ORDER-3",
      }),
    ),
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 1);
  c = await store.readCatalog();
  assert.equal(c.inventory.sample.stock.quantity, 0);
  assert.equal(c.sales.length, 2);
  assert.equal((await store.publicCatalog())[0].available, false);
  const month = schema.dayInCairo(new Date().toISOString()).slice(0, 7);
  const report = (await service.report(get("/?month=" + month), "monthly-profit")).body;
  assert.equal(report.total_revenue, 750);
  assert.equal(report.total_cost, 350);
  assert.equal(report.total_profit, 400);
  assert.equal(report.units_sold, 3);
  assert.equal(
    (await service.report(get("/?month=" + month + "&category=hair"), "monthly-profit")).body
      .total_revenue,
    0,
  );
  assert.equal((await service.report(get("/?date=2026-02-30"), "daily-summary")).status, 400);
  assert.equal((await service.report(get("/?month=2026-13"), "monthly-profit")).status, 400);
  assert.equal((await service.report(get("/?month=" + month), "best-sellers")).body[0].rank, 1);
  assert.equal((await service.report(get("/"), "profit-margins")).body.highest_margin.margin, 50);
  assert.equal(schema.dayInCairo("2026-09-01T22:30:00Z"), "2026-09-02");
  assert(invalidations > 0);
  // A sale price can be saved before the supplier's purchase cost is known.
  const snapshots = JSON.stringify((await store.readCatalog()).sales);
  await service.updateInventory(req({ quantity: 3, min_stock_alert: 1 }), "sample", "stock");
  const unknown = await service.updateInventory(
    req({ cost_price: null, selling_price: 1450, discount: 10 }),
    "sample",
    "pricing",
  );
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.product.effective_price, 1305);
  for (const key of ["cost_price", "profit_per_unit", "profit_margin", "sales_margin"])
    assert.equal(unknown.body.product[key], null, key);
  assert.equal((await service.report(get("/"), "profit-margins")).body.highest_margin, null);
  const beforeBlockedSale = JSON.stringify(await store.readCatalog());
  assert.equal(
    (
      await service.recordSale(
        req({
          ...second,
          request_id: crypto.randomUUID(),
          order_reference: "UNKNOWN-COST",
        }),
      )
    ).status,
    400,
  );
  assert.equal(JSON.stringify(await store.readCatalog()), beforeBlockedSale);
  const currentVersion = (await store.readCatalog()).version;
  const updated = await service.updateInventory(
    req({
      version: currentVersion,
      cost_price: null,
      selling_price: 1550,
      discount: 0,
    }),
    "sample",
    "pricing",
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.product.selling_price, 1550);
  assert.equal(
    (
      await service.updateInventory(
        req({ version: currentVersion, cost_price: null, selling_price: 1 }),
        "sample",
        "pricing",
      )
    ).status,
    409,
  );
  c = await store.readCatalog();
  assert.equal(c.priceHistory.at(-1).old_pricing.selling_price, 1450);
  assert.equal(c.priceHistory.at(-1).new_pricing.cost_price, null);
  assert.equal(JSON.stringify(c.sales), snapshots);
  const known = await service.updateInventory(
    req({ cost_price: 900, selling_price: 1550, discount: 0 }),
    "sample",
    "pricing",
  );
  assert.equal(known.body.product.profit_per_unit, 650);
  assert.equal(
    schema.figures({ cost_price: 0, selling_price: 1550, discount: 0 }).profit_per_unit,
    1550,
  );
  assert.equal(schema.pricingInput.parse({ selling_price: 1550 }).cost_price, null);
  assert.equal(
    (
      await service.updateInventory(
        req({ cost_price: -1, selling_price: 1550 }),
        "sample",
        "pricing",
      )
    ).status,
    400,
  );
  console.log(
    "PASS inventory: validation, auth/origin, public privacy, discounts/margins, atomic sales, concurrent oversell prevention, idempotency, price snapshots, legacy preservation, Cairo reports and alerts",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
