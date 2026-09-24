const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  ts = require(path.join(root, "node_modules/typescript")),
  z = require(path.join(root, "node_modules/zod"));
class AdminError extends Error {
  constructor(m, status = 400) {
    super(m);
    this.status = status;
  }
}
let calls = [],
  issued = [],
  verified = false,
  wrong = false,
  disabled = false,
  limited = false;
const env = { FIREBASE_WEB_API_KEY: "test", ADMIN_SESSION_SECRET: "x".repeat(32) };
const m = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(path.join(root, "app/lib/firebase-email.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: m.exports,
    process: { env },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return {
        ok: true,
        json: async () =>
          url.includes("lookup")
            ? {
                users: [
                  {
                    email: wrong ? "wrong@test.com" : "buyer@test.com",
                    emailVerified: verified,
                    disabled,
                  },
                ],
              }
            : { idToken: "provider-only-token" },
      };
    },
    require: (n) =>
      n === "server-only"
        ? {}
        : n === "zod"
          ? { z }
          : n === "next/server"
            ? { NextResponse: { json: (body, options) => ({ body, ...options }) } }
            : n === "./customer-auth"
              ? { issueCustomerSession: (r, email) => issued.push(email) }
              : n === "./admin-auth"
                ? {
                    AdminError,
                    sameOrigin: (r) => {
                      if (r.headers.get("origin") !== "https://test.local")
                        throw new AdminError("origin", 403);
                    },
                    limitedJson: (r) => r.json(),
                    limitLogin: async () => {
                      if (limited) throw new AdminError("limit", 429);
                    },
                  }
                : require(n),
  },
);
const req = (action, extra = {}, origin = "https://test.local") =>
  new Request("https://test.local/api/account/email", {
    method: "POST",
    headers: { origin },
    body: JSON.stringify({ action, email: "buyer@test.com", password: "long-password", ...extra }),
  });
(async () => {
  assert.equal((await m.exports.emailPassword(req("signin", {}, "https://evil.test"))).status, 403);
  assert.equal((await m.exports.emailPassword(req("signin", { password: "x" }))).status, 400);
  let r = await m.exports.emailPassword(req("signin"));
  assert.equal(r.body.verification_required, true);
  assert.equal(issued.length, 0);
  verified = true;
  r = await m.exports.emailPassword(req("signin"));
  assert.equal(r.body.authenticated, true);
  assert.deepEqual(issued, ["buyer@test.com"]);
  assert(!JSON.stringify(r).includes("provider-only-token"));
  wrong = true;
  assert.equal((await m.exports.emailPassword(req("signin"))).status, 401);
  wrong = false;
  disabled = true;
  assert.equal((await m.exports.emailPassword(req("signin"))).status, 401);
  disabled = false;
  r = await m.exports.emailPassword(req("signup"));
  assert.equal(r.body.verification_sent, true);
  assert.equal(calls.at(-1).body.requestType, "VERIFY_EMAIL");
  assert.equal(issued.length, 1);
  r = await m.exports.emailPassword(req("reset"));
  assert.equal(r.body.reset_sent, true);
  limited = true;
  assert.equal((await m.exports.emailPassword(req("signin"))).status, 429);
  limited = false;
  delete env.FIREBASE_WEB_API_KEY;
  assert.equal((await m.exports.emailPassword(req("signin"))).status, 503);
  console.log(
    "PASS Firebase email: origin, validation, verified identity only, provider token privacy, signup/reset, rate limit and configuration",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
