const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = path.resolve(__dirname, ".."),
  ts = require(root + "/node_modules/typescript"),
  z = require(root + "/node_modules/zod");
const store = new Map(),
  jar = new Map();
let revision = 0,
  emailMessage,
  failSend = false,
  now = Date.now();
class Clock extends Date {
  static now() {
    return now;
  }
}
class AdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const env = {
  ADMIN_SESSION_SECRET: "test-customer-secret-with-more-than-32-characters",
  RESEND_API_KEY: "test-only",
  CUSTOMER_EMAIL_FROM: "Clarea <test@example.com>",
  NODE_ENV: "production",
};
const orders = [
  {
    id: "one",
    reference: "ONE",
    revenue: 1200,
    items: [
      {
        name: "Product",
        quantity: 1,
        selling_price: 1200,
        revenue: 1200,
        cost_price: 800,
        profit: 400,
      },
    ],
    customer: { email: "owner@example.com" },
    status: "pending",
    created_at: "now",
  },
  {
    id: "two",
    reference: "TWO",
    revenue: 200,
    items: [],
    customer: { email: "other@example.com" },
    status: "confirmed",
    created_at: "now",
  },
];
const blob = {
  get: async (key) => {
    const entry = store.get(key);
    return entry
      ? { statusCode: 200, stream: JSON.stringify(entry.data), blob: { etag: entry.etag } }
      : null;
  },
  put: async (key, body, opts) => {
    const old = store.get(key);
    if (old ? opts.ifMatch !== old.etag : opts.allowOverwrite) throw new Error("Conflict");
    const etag = String(++revision);
    store.set(key, { data: JSON.parse(body), etag });
    return { etag };
  },
};
const response = {
  json: (body, options = {}) => ({
    body,
    status: options.status || 200,
    headers: options.headers,
    cookies: {
      set: (name, value, opts) => {
        assert.equal(opts.httpOnly, true);
        assert.equal(opts.secure, true);
        jar.set(name, { value, opts });
      },
    },
  }),
};
const source = ts.transpileModule(fs.readFileSync(root + "/app/lib/customer-auth.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(source, {
  exports: mod.exports,
  require(name) {
    if (name === "server-only") return {};
    if (name === "./google-login-config") return { googleLoginConfigured: () => false };
    if (name === "zod") return z;
    if (name === "next/headers") return { cookies: async () => ({ get: (n) => jar.get(n) }) };
    if (name === "next/server") return { NextResponse: response };
    if (name === "@vercel/blob") return blob;
    if (name === "./catalog-store")
      return { namespace: "test", storageETag: (x) => x, readCatalog: async () => ({ orders }) };
    if (name === "./order-tracking") return { trackingPath: (o) => "/track#" + o.id };
    if (name === "./admin-auth")
      return {
        AdminError,
        sameOrigin: (r) => {
          if (r.headers.get("origin") !== "https://test.local") throw new AdminError("origin", 403);
        },
        limitedJson: (r) => r.json(),
        limitLogin: async () => {},
      };
    return require(name);
  },
  process: { env },
  Buffer,
  Date: Clock,
  Response,
  AbortSignal,
  fetch: async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    emailMessage = JSON.parse(options.body);
    return { ok: !failSend };
  },
  console,
});
const auth = mod.exports;
const req = (body, origin = "https://test.local") =>
  new Request("https://test.local/api/account", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
(async () => {
  assert.equal((await auth.accountOrders()).body.authenticated, false);
  assert.equal(
    (await auth.sendCode(req({ email: "owner@example.com" }, "https://evil.test"))).status,
    403,
  );
  assert.equal((await auth.sendCode(req({ email: "bad" }))).status, 400);
  const sent = await auth.sendCode(req({ email: "OWNER@example.com" }));
  assert.equal(sent.status, 200);
  assert.equal(emailMessage.to[0], "owner@example.com");
  const code = emailMessage.text.match(/\d{6}/)[0],
    challenge = sent.body.challenge;
  assert(!JSON.stringify(sent.body).includes(code));
  assert(!JSON.stringify([...store.values()]).includes(code));
  assert.equal((await auth.sendCode(req({ email: "owner@example.com" }))).status, 429);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await auth.verifyCode(req({ email: "owner@example.com", code: "000000", challenge })))
        .status,
      400,
    );
  assert.equal(
    (await auth.verifyCode(req({ email: "owner@example.com", code, challenge }))).status,
    400,
  );
  now += 61000;
  const fresh = await auth.sendCode(req({ email: "owner@example.com" }));
  const nextCode = emailMessage.text.match(/\d{6}/)[0];
  const verify = { email: "owner@example.com", code: nextCode, challenge: fresh.body.challenge };
  const results = await Promise.all([auth.verifyCode(req(verify)), auth.verifyCode(req(verify))]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(await auth.customerEmail(), "owner@example.com");
  const account = await auth.accountOrders();
  assert.equal(account.body.orders.length, 1);
  assert.equal(account.body.orders[0].reference, "ONE");
  assert.equal(account.headers["Cache-Control"], "private, no-store");
  assert(!JSON.stringify(account.body).includes("cost_price"));
  assert.equal(
    (
      await auth.updateProfile(
        req({ profile: { name: "Buyer", phone: "01012345678", address: "Cairo" }, version: "new" }),
      )
    ).status,
    200,
  );
  const profiled = await auth.accountOrders();
  assert.equal(profiled.body.profile.name, "Buyer");
  assert.equal(
    (
      await auth.updateProfile(
        req({ profile: { name: "Other", phone: "", address: "" }, version: "new" }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await auth.updateProfile(
        req({
          profile: { name: "Other", phone: "", address: "", email: "other@example.com" },
          version: profiled.body.profile_version,
        }),
      )
    ).status,
    400,
  );
  const saved = jar.get("clarea_customer");
  jar.set("clarea_customer", { value: saved.value + "x" });
  assert.equal(await auth.customerEmail(), null);
  jar.set("clarea_customer", saved);
  now += 8 * 24 * 60 * 60 * 1000;
  assert.equal(await auth.customerEmail(), null);
  await auth.logout(req({}));
  assert.equal(
    (
      await auth.updateProfile(
        req({ profile: { name: "Intruder", phone: "", address: "" }, version: "new" }),
      )
    ).status,
    401,
  );
  assert.equal(await auth.customerEmail(), null);
  const expired = await auth.sendCode(req({ email: "expires@example.com" }));
  const expiredCode = emailMessage.text.match(/\d{6}/)[0];
  now += 11 * 60 * 1000;
  assert.equal(
    (
      await auth.verifyCode(
        req({ email: "expires@example.com", code: expiredCode, challenge: expired.body.challenge }),
      )
    ).status,
    400,
  );
  failSend = true;
  assert.equal((await auth.sendCode(req({ email: "fail@example.com" }))).status, 503);
  delete env.RESEND_API_KEY;
  assert.equal((await auth.sendCode(req({ email: "disabled@example.com" }))).status, 503);
  console.log(
    "PASS customer auth: origin, email validation, hashed expiring OTP, cooldown, five-guess lockout, atomic one-use verification, HttpOnly session, tampering, expiry, account isolation, logout, delivery failure and disabled configuration",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
