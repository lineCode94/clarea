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
  limitLogin: async () => {},
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
      if (name === "./customer-auth") return { customerEmail: async () => null };
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
    process: {
      env: {
        CATALOG_NAMESPACE: "unit-test",
        ADMIN_SESSION_SECRET: "tracking-test-secret-that-is-at-least-32-characters",
      },
    },
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

const orders = load("app/lib/order-service.ts");
(async () => {
  let c = await store.readCatalog();
  c.products = [product, { ...product, id: "second", name: "Second", category: "hair" }];
  await store.saveCatalog(c.products, c.version, c);
  const orderInput = {
    request_id: crypto.randomUUID(),
    customer: {
      name: "Private customer",
      phone: "01000000000",
      address: "Private address",
    },
    notes: "Private note",
    items: [
      { product_id: "sample", quantity: 2 },
      { product_id: "second", quantity: 3 },
    ],
  };
  authorized = false;
  assert.equal((await orders.listOrders(get("/"))).status, 401);
  assert.equal((await orders.createOrder(req(orderInput))).status, 401);
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), "missing")).status, 401);
  authorized = true;
  assert.equal((await orders.createOrder(req(orderInput, "/", "https://evil.test"))).status, 403);
  assert.equal((await orders.createOrder(req(orderInput))).status, 400);
  for (const id of ["sample", "second"])
    await service.updateInventory(req({ quantity: 10, min_stock_alert: 2 }), id, "stock");
  await service.updateInventory(
    req({ cost_price: 100, selling_price: 250, discount: 10 }),
    "sample",
    "pricing",
  );
  await service.updateInventory(req({ cost_price: 50, selling_price: 100 }), "second", "pricing");
  assert.equal((await orders.createOrder(req({ ...orderInput, items: [] }))).status, 400);
  assert.equal(
    (
      await orders.createOrder(
        req({
          ...orderInput,
          items: [{ product_id: "sample", quantity: 1.5 }],
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await orders.createOrder(
        req({
          ...orderInput,
          items: [
            { product_id: "sample", quantity: 1 },
            { product_id: "sample", quantity: 2 },
          ],
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await orders.createOrder(
        req({ ...orderInput, items: [{ product_id: "sample", quantity: 11 }] }),
      )
    ).status,
    409,
  );
  assert.equal((await orders.createOrder(req({ ...orderInput, version: "stale" }))).status, 409);
  const created = await orders.createOrder(req(orderInput));
  assert.equal(created.status, 200);
  const order = created.body.order;
  assert.match(order.reference, /^CL-\d{8}-000001$/);
  assert.equal(order.revenue, 750);
  assert.equal(order.cost, 350);
  assert.equal(order.profit, 400);
  assert.equal(order.status, "pending");
  assert.equal(order.items[0].image, "/test.png");
  c = await store.readCatalog();
  assert.equal(c.inventory.sample.stock.quantity, 10);
  assert.equal(c.sales.length, 0);
  assert((await store.publicCatalog()).every((p) => p.best_seller_rank === undefined));
  assert.equal((await orders.createOrder(req(orderInput))).body.duplicate, true);
  assert.equal((await orders.createOrder(req({ ...orderInput, notes: "different" }))).status, 409);
  assert.equal((await store.readCatalog()).orders.length, 1);
  // Product price changes must not rewrite already-agreed order totals.
  await service.updateInventory(req({ cost_price: 200, selling_price: 400 }), "sample", "pricing");
  let visible = (await store.publicCatalog()).find((p) => p.id === "sample");
  assert.equal(visible.public_price, 400);
  assert.equal(visible.discount, undefined);
  await service.updateInventory(
    req({ cost_price: 200, selling_price: 400, discount: 10 }),
    "sample",
    "pricing",
  );
  visible = (await store.publicCatalog()).find((p) => p.id === "sample");
  assert.equal(visible.public_price, 360);
  assert.equal(visible.original_price, 400);
  assert.equal(visible.discount, 10);
  await service.updateInventory(
    req({ cost_price: 200, selling_price: 400, discount: 0 }),
    "sample",
    "pricing",
  );
  visible = (await store.publicCatalog()).find((p) => p.id === "sample");
  assert.equal(visible.public_price, 400);
  assert.equal(visible.original_price, undefined);
  assert.equal(visible.discount, undefined);

  await service.updateInventory(req({ quantity: 2, min_stock_alert: 2 }), "second", "stock");
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), order.id)).status, 409);
  c = await store.readCatalog();
  assert.equal(c.inventory.sample.stock.quantity, 10);
  assert.equal(c.sales.length, 0);
  assert.equal(c.orders[0].status, "pending");
  await service.updateInventory(req({ quantity: 10, min_stock_alert: 2 }), "second", "stock");
  forceConflict = true;
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), order.id)).status, 409);
  assert.equal((await store.readCatalog()).sales.length, 0);
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), order.id)).status, 200);
  c = await store.readCatalog();
  assert.equal(c.sales.length, 2);
  const publicRanks = await store.publicCatalog();
  assert.equal(publicRanks.find((p) => p.id === "second").best_seller_rank, 1);
  assert.equal(publicRanks.find((p) => p.id === "sample").best_seller_rank, 2);
  assert(publicRanks.every((p) => !("units_sold" in p) && !("revenue" in p)));
  assert.equal(c.inventory.sample.stock.quantity, 8);
  assert.equal(c.inventory.second.stock.quantity, 7);
  assert.equal(c.sales.find((s) => s.product_id === "sample").selling_price, 225);
  assert.equal(c.sales.find((s) => s.product_id === "sample").cost_price, 100);
  assert.equal(
    (await orders.changeOrder(req({ status: "delivered" }), order.id)).body.duplicate,
    true,
  );
  assert.equal((await orders.changeOrder(req({ status: "cancelled" }), order.id)).status, 409);
  assert.equal((await store.readCatalog()).sales.length, 2);
  const report = (await service.report(get("/"), "monthly-profit")).body;
  assert.equal(report.total_revenue, 750);
  assert.equal(report.total_profit, 400);
  assert.equal(report.units_sold, 5);
  assert.equal(report.orders_count, 1);
  assert.equal(
    (
      await service.recordSale(
        req({
          product_id: "sample",
          quantity_sold: 1,
          request_id: crypto.randomUUID(),
          order_reference: order.reference,
        }),
      )
    ).status,
    409,
  );
  const another = {
    ...orderInput,
    request_id: crypto.randomUUID(),
    items: [
      { product_id: "sample", quantity: 1 },
      { product_id: "second", quantity: 1 },
    ],
  };
  const cancelled = (await orders.createOrder(req(another))).body.order;
  assert.equal((await orders.changeOrder(req({ status: "cancelled" }), cancelled.id)).status, 200);
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), cancelled.id)).status, 409);
  assert.equal((await store.readCatalog()).inventory.sample.stock.quantity, 8);
  const pending = (await orders.createOrder(req({ ...another, request_id: crypto.randomUUID() })))
    .body.order;
  const deliveries = await Promise.all([
    orders.changeOrder(req({ status: "delivered" }), pending.id),
    orders.changeOrder(req({ status: "delivered" }), pending.id),
  ]);
  assert.equal(deliveries.filter((r) => r.status === 200).length, 1);
  c = await store.readCatalog();
  assert.equal(c.sales.length, 4);
  assert.equal(c.inventory.sample.stock.quantity, 7);
  assert.equal(c.inventory.second.stock.quantity, 6);
  const concurrent = [
    { ...another, request_id: crypto.randomUUID() },
    { ...another, request_id: crypto.randomUUID() },
  ];
  const results = await Promise.all(concurrent.map((i) => orders.createOrder(req(i))));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  const failed = results.findIndex((r) => r.status === 409);
  assert.equal((await orders.createOrder(req(concurrent[failed]))).status, 200);
  c = await store.readCatalog();
  assert.equal(new Set(c.orders.map((o) => o.reference)).size, c.orders.length);
  const before = c.orders.length;
  await store.saveCatalog(c.products, c.version);
  assert.equal((await store.readCatalog()).orders.length, before);
  const publicJSON = JSON.stringify(await store.publicCatalog());
  for (const token of [
    "Private customer",
    "Private address",
    "Private note",
    "01000000000",
    "orders",
    "customer",
    "orderSequence",
  ])
    assert(!publicJSON.includes(token), token + " leaked");
  assert.equal((await orders.listOrders(get("/?status=cancelled"))).body.total, 1);
  assert.equal((await orders.listOrders(get("/?q=" + order.reference))).body.total, 1);
  assert.equal((await orders.listOrders(get("/?offset=999"))).body.orders.length, 0);
  // Order discount overrides product discounts; zero explicitly disables them.
  await service.updateInventory(
    req({ cost_price: 100, selling_price: 250, discount: 10 }),
    "sample",
    "pricing",
  );
  const discountedInput = {
    ...another,
    request_id: crypto.randomUUID(),
    discount_percent: 20,
  };
  const discounted = (await orders.createOrder(req(discountedInput))).body.order;
  assert.equal(discounted.revenue, 280);
  assert.equal(discounted.cost, 150);
  assert.equal(discounted.profit, 130);
  assert.equal(discounted.discount_percent, 20);
  assert.equal(
    (await orders.createOrder(req({ ...discountedInput, discount_percent: 0 }))).status,
    409,
  );
  const fullPrice = (
    await orders.createOrder(
      req({ ...another, request_id: crypto.randomUUID(), discount_percent: 0 }),
    )
  ).body.order;
  assert.equal(fullPrice.revenue, 350);
  assert.equal(fullPrice.cost, 150);
  for (const discount_percent of [-1, 101])
    assert.equal(
      (
        await orders.createOrder(
          req({
            ...another,
            request_id: crypto.randomUUID(),
            discount_percent,
          }),
        )
      ).status,
      400,
    );
  await orders.changeOrder(req({ status: "delivered" }), discounted.id);
  const discountedSales = (await store.readCatalog()).sales.filter(
    (s) => s.order_id === discounted.id,
  );
  assert.equal(
    discountedSales.reduce((n, s) => n + s.revenue, 0),
    280,
  );
  assert.equal(
    discountedSales.reduce((n, s) => n + s.cost, 0),
    150,
  );
  console.log(
    "Checking orders reject unknown purchase costs without changing stored orders or stock",
  );
  await service.updateInventory(
    req({ cost_price: null, selling_price: 1700, discount: 0 }),
    "sample",
    "pricing",
  );
  const beforeUnknownCost = JSON.stringify(await store.readCatalog());
  const noCostOrder = await orders.createOrder(
    req({ ...another, request_id: crypto.randomUUID() }),
  );
  assert.equal(noCostOrder.status, 400);
  assert.match(noCostOrder.body.error, /سعر شراء/);
  assert.equal(JSON.stringify(await store.readCatalog()), beforeUnknownCost);
  // Storefront checkout shares the ledger, but never returns private accounting or PII.
  const checkout = load("app/lib/checkout-service.ts").checkout;
  authorized = false;
  const webInput = {
    request_id: crypto.randomUUID(),
    customer: {
      name: "Web customer",
      phone: "01012345678",
      email: "private@example.com",
      address: "Cairo, street 12, building 7",
    },
    payment_method: "COD",
    shipping_acknowledged: true,
    items: [{ product_id: "sample", quantity: 1, expected_price: 1700 }],
  };
  assert.equal((await checkout(req(webInput, "/api/checkout", "https://evil.test"))).status, 403);
  assert.equal((await checkout(req({ ...webInput, payment_method: "Instapay" }))).status, 400);
  assert.equal(
    (await checkout(req({ ...webInput, items: [{ ...webInput.items[0], expected_price: 1 }] })))
      .status,
    409,
  );
  assert.equal(
    (await checkout(req({ ...webInput, items: [{ ...webInput.items[0], quantity: 21 }] }))).status,
    400,
  );
  assert.equal((await checkout(req({ ...webInput, shipping_acknowledged: false }))).status, 400);
  assert.equal(
    (await checkout(req({ ...webInput, customer: { ...webInput.customer, phone: "123" } }))).status,
    400,
  );
  assert.equal((await checkout(req({ ...webInput, cost_price: 0 }))).status, 400);
  c = await store.readCatalog();
  const originalStock = c.inventory.sample.stock;
  c.inventory.sample.stock = { ...originalStock, quantity: 0, status: "out_of_stock" };
  await store.saveCatalog(c.products, c.version, c);
  assert.equal((await checkout(req(webInput))).status, 409);
  c = await store.readCatalog();
  c.inventory.sample.stock = originalStock;
  await store.saveCatalog(c.products, c.version, c);
  // Unknown supplier inventory is allowed only if the published product is available.
  c = await store.readCatalog();
  delete c.inventory.sample.stock;
  c.products.find((p) => p.id === "sample").available = true;
  await store.saveCatalog(c.products, c.version, c);
  const webResponse = await checkout(req(webInput));
  assert.equal(webResponse.status, 200);
  assert.equal(webResponse.body.order.subtotal, 1700);
  assert.equal(webResponse.body.order.shipping_fee, null);
  const publicReceipt = JSON.stringify(webResponse.body);
  for (const token of [
    "cost",
    "profit",
    "customer",
    "private@example.com",
    "01012345678",
    "request_fingerprint",
  ])
    assert(!publicReceipt.includes(token), token + " leaked");
  const count = (await store.readCatalog()).orders.length;
  assert.equal(
    (await checkout(req(webInput))).body.order.reference,
    webResponse.body.order.reference,
  );
  assert.equal((await store.readCatalog()).orders.length, count);
  assert.equal(
    (await checkout(req({ ...webInput, customer: { ...webInput.customer, name: "Other" } })))
      .status,
    409,
  );
  c = await store.readCatalog();
  const webOrder = c.orders.find((o) => o.reference === webResponse.body.order.reference);
  assert.equal(webOrder.source, "storefront");
  assert.equal(webOrder.items[0].cost_pending, true);
  assert.equal(webOrder.profit, 0);
  authorized = true;
  const beforeDelivery = JSON.stringify(await store.readCatalog());
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), webOrder.id)).status, 409);
  assert.equal(JSON.stringify(await store.readCatalog()), beforeDelivery);
  await service.updateInventory(
    req({ cost_price: 1300, selling_price: 1800 }),
    "sample",
    "pricing",
  );
  await service.updateInventory(req({ quantity: 10, min_stock_alert: 2 }), "sample", "stock");
  assert.equal((await orders.changeOrder(req({ status: "delivered" }), webOrder.id)).status, 200);
  c = await store.readCatalog();
  const webSale = c.sales.find((s) => s.order_id === webOrder.id);
  assert.equal(webSale.cost, 1300);
  assert.equal(webSale.revenue, 1700);
  assert.equal(webSale.profit, 400);
  assert.equal(c.inventory.sample.stock.quantity, 9);
  // Forward-only fulfillment, with no sales or stock deduction until delivery.
  const fulfillmentInput = {
    ...webInput,
    request_id: crypto.randomUUID(),
    items: [{ product_id: "sample", quantity: 1, expected_price: 1800 }],
  };
  const fulfillmentReceipt = (await checkout(req(fulfillmentInput))).body.order;
  c = await store.readCatalog();
  const fulfillment = c.orders.find((o) => o.reference === fulfillmentReceipt.reference);
  const stockBefore = c.inventory.sample.stock.quantity;
  assert.equal((await orders.changeOrder(req({ status: "shipped" }), fulfillment.id)).status, 409);
  assert.equal(
    (await orders.changeOrder(req({ status: "confirmed" }), fulfillment.id)).status,
    200,
  );
  assert.equal((await orders.changeOrder(req({ status: "shipped" }), fulfillment.id)).status, 200);
  assert.equal(
    (await orders.changeOrder(req({ status: "confirmed" }), fulfillment.id)).status,
    409,
  );
  assert.equal((await store.readCatalog()).inventory.sample.stock.quantity, stockBefore);
  assert.equal(
    (await orders.changeOrder(req({ status: "delivered" }), fulfillment.id)).status,
    200,
  );
  const freeShipping = {
    ...webInput,
    request_id: crypto.randomUUID(),
    items: [{ product_id: "sample", quantity: 3, expected_price: 1800 }],
  };
  forceConflict = true;
  const free = await checkout(req(freeShipping));
  assert.equal(free.status, 200);
  assert.equal(free.body.order.shipping_fee, 0);
  c = await store.readCatalog();
  c.products.find((p) => p.id === "sample").published = false;
  await store.saveCatalog(c.products, c.version, c);
  assert.equal(
    (await checkout(req({ ...freeShipping, request_id: crypto.randomUUID() }))).status,
    409,
  );
  const tracking = load("app/lib/order-tracking.ts");
  const pathForOrder = tracking.trackingPath(order);
  assert.match(pathForOrder, /^\/track#[a-f0-9-]{36}\.[a-f0-9]{64}$/);
  const token = pathForOrder.split("#")[1];
  authorized = false;
  for (const candidate of [
    "",
    order.reference,
    order.id,
    token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"),
  ])
    assert.equal((await tracking.trackOrder(req({ token: candidate }))).status, 404);
  assert.equal(
    (await tracking.trackOrder(req({ token }, "/api/orders/track", "https://evil.test"))).status,
    403,
  );
  const tracked = await tracking.trackOrder(req({ token }));
  assert.equal(tracked.status, 200);
  assert.equal(tracked.body.order.status, "delivered");
  assert.equal(tracked.body.order.reference, order.reference);
  assert.equal(tracked.headers["Cache-Control"], "private, no-store");
  assert.deepEqual(Object.keys(tracked.body.order).sort(), ["reference", "status", "updated_at"]);
  assert.equal(
    (
      await tracking.trackOrder(
        req({ token: tracking.trackingPath({ id: crypto.randomUUID() }).split("#")[1] }),
      )
    ).status,
    404,
  );
  assert.equal((await orders.listOrders(get("/"))).status, 401);
  authorized = true;
  const listing = await orders.listOrders(get("/?q=" + order.reference));
  assert.equal(listing.body.orders[0].tracking_path, pathForOrder);
  const allListing = (await orders.listOrders(get("/?limit=1&sort=oldest"))).body;
  assert.equal(allListing.orders.length, 1);
  assert.equal(allListing.counts.all, allListing.total);
  const pageTwo = (await orders.listOrders(get("/?limit=1&sort=oldest&offset=1"))).body;
  assert.notEqual(allListing.orders[0].id, pageTwo.orders[0].id);
  const deliveredListing = (await orders.listOrders(get("/?status=delivered"))).body;
  assert(deliveredListing.orders.every((o) => o.status === "delivered"));
  assert.equal(deliveredListing.total, deliveredListing.counts.delivered);
  assert.equal((await orders.listOrders(get("/?limit=100"))).status, 400);
  const phone = allListing.orders[0].customer.phone;
  if (phone)
    assert(
      (await orders.listOrders(get("/?q=" + encodeURIComponent(phone)))).body.orders.some(
        (o) => o.customer.phone === phone,
      ),
    );

  assert.equal(
    (await checkout(req(webInput))).body.order.tracking_path,
    tracking.trackingPath(webOrder),
  );
  assert(!JSON.stringify(await store.publicCatalog()).includes("tracking_path"));
  console.log(
    "PASS tracking: legacy order links, tamper rejection, unknown IDs, status freshness, authenticated admin links and no customer/accounting leakage",
  );
  console.log(
    "PASS checkout: COD only, server prices, unavailable/hidden products, supplier stock, safe receipts, idempotency, CAS retry, address-based shipping and cost resolution before delivery",
  );
  console.log(
    "PASS orders: private auth, automatic unique numbering, creation replay safety, multi-item discount totals, immutable snapshots, all-or-nothing delivery, concurrency, cancellation, one-order report counts and no public customer leakage",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
