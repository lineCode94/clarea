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

const store = load("app/lib/catalog-store.ts"),
  route = load("app/api/admin/products/route.ts");
const req = (body, origin = "https://test.local") =>
  new Request("https://test.local/api/admin/products", {
    method: "DELETE",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
(async () => {
  let c = await store.readCatalog();
  await store.saveCatalog(c.products, c.version, c);
  c = await store.readCatalog();
  authorized = false;
  assert.equal((await route.DELETE(req({ id: "sample", version: c.version }))).status, 401);
  authorized = true;
  assert.equal(
    (await route.DELETE(req({ id: "sample", version: c.version }, "https://evil.test"))).status,
    403,
  );
  assert.equal((await route.DELETE(req({ id: "sample", version: "old" }))).status, 409);
  assert.equal((await route.DELETE(req({ id: "missing", version: c.version }))).status, 404);
  stored.orders = [
    {
      id: "order",
      reference: "CL-1",
      request_id: "x",
      request_fingerprint: "x",
      customer: { name: "buyer", phone: "", address: "" },
      notes: "",
      items: [
        {
          product_id: "sample",
          name: "Sample",
          category: "skin",
          quantity: 1,
          selling_price: 100,
          cost_price: 50,
          discount: 0,
          revenue: 100,
          cost: 50,
          profit: 50,
        },
      ],
      status: "pending",
      revenue: 100,
      cost: 50,
      profit: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      changed_by: "admin",
    },
  ];
  assert.equal((await route.DELETE(req({ id: "sample", version: c.version }))).status, 409);
  stored.orders[0].status = "delivered";
  const snapshot = JSON.stringify(stored.orders);
  forceConflict = true;
  assert.equal((await route.DELETE(req({ id: "sample", version: c.version }))).status, 409);
  assert(stored.products.some((p) => p.id === "sample"));
  const result = await route.DELETE(req({ id: "sample", version: c.version }));
  assert.equal(result.status, 200);
  assert(!stored.products.some((p) => p.id === "sample"));
  assert.equal(JSON.stringify(stored.orders), snapshot);
  console.log(
    "PASS delete: admin/origin checks, stale version, missing product, open-order protection, CAS and historical order preservation",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
