const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = path.resolve(__dirname, ".."),
  ts = require(root + "/node_modules/typescript"),
  z = require(root + "/node_modules/zod");
let configured = true,
  now = Date.now(),
  authParams,
  exchanges = 0,
  issued = null,
  badNonce = false,
  unverified = false,
  rejectToken = false;
const jar = new Map();
class Clock extends Date {
  static now() {
    return now;
  }
}
class OAuth2Client {
  constructor(options) {
    assert.equal(
      options.redirectUri,
      "https://clarea-three.vercel.app/api/account/google/callback",
    );
  }
  generateAuthUrl(params) {
    authParams = params;
    assert.deepEqual(Array.from(params.scope), ["openid", "email"]);
    assert.equal(params.code_challenge_method, "S256");
    return "https://accounts.google.com/o/oauth2/v2/auth?state=" + params.state;
  }
  async getToken(params) {
    exchanges++;
    assert.equal(params.code, "test-code");
    assert.equal(params.codeVerifier.length, 43);
    assert.equal(
      params.redirect_uri,
      "https://clarea-three.vercel.app/api/account/google/callback",
    );
    return { tokens: { id_token: "signed-google-token" } };
  }
  async verifyIdToken(params) {
    assert.equal(params.audience, "test-client");
    assert.equal(params.idToken, "signed-google-token");
    if (rejectToken) throw Error("Invalid signature");
    return {
      getPayload: () => ({
        sub: "google-user",
        email: "buyer@example.com",
        email_verified: !unverified,
        nonce: badNonce ? "bad" : authParams.nonce,
      }),
    };
  }
}
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(root + "/app/lib/google-login.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    exports: mod.exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "zod") return z;
      if (name === "google-auth-library")
        return { OAuth2Client, CodeChallengeMethod: { S256: "S256" } };
      if (name === "next/headers") return { cookies: async () => ({ get: (k) => jar.get(k) }) };
      if (name === "next/server")
        return {
          NextResponse: {
            redirect: (url) => ({
              url,
              headers: new Headers(),
              cookies: {
                set: (name, value, options) => {
                  assert.equal(options.httpOnly, true);
                  assert.equal(options.secure, true);
                  jar.set(name, { value });
                },
              },
            }),
          },
        };
      if (name === "./customer-auth")
        return {
          issueCustomerSession: (response, email) => {
            issued = email;
          },
        };
      if (name === "./google-login-config")
        return {
          googleLoginConfigured: () => configured,
          customerSiteOrigin: () => "https://clarea-three.vercel.app",
        };
      return require(name);
    },
    process: {
      env: {
        GOOGLE_CLIENT_ID: "test-client",
        GOOGLE_CLIENT_SECRET: "test-secret",
        ADMIN_SESSION_SECRET: "test-session-key-at-least-32-characters",
        NODE_ENV: "production",
      },
    },
    Date: Clock,
    Buffer,
    URL,
  },
);
const login = mod.exports;
const request = (params) =>
  new Request(
    "https://untrusted-host.test/api/account/google/callback?" + new URLSearchParams(params),
  );
(async () => {
  configured = false;
  assert((await login.startGoogle()).url.endsWith("login=unavailable"));
  configured = true;
  await login.startGoogle();
  assert.equal(
    (await login.finishGoogle(request({ code: "test-code", state: "wrong" }))).url,
    "https://clarea-three.vercel.app/account?login=failed",
  );
  assert.equal(exchanges, 0);
  await login.startGoogle();
  const cancelled = await login.finishGoogle(
    request({ state: authParams.state, error: "access_denied" }),
  );
  assert(cancelled.url.endsWith("login=cancelled"));
  assert.equal(exchanges, 0);
  await login.startGoogle();
  const cookie = jar.get("clarea_google_flow").value;
  jar.set("clarea_google_flow", { value: cookie + "x" });
  assert(
    (
      await login.finishGoogle(request({ state: authParams.state, code: "test-code" }))
    ).url.endsWith("login=failed"),
  );
  assert.equal(exchanges, 0);
  await login.startGoogle();
  now += 600001;
  assert(
    (
      await login.finishGoogle(request({ state: authParams.state, code: "test-code" }))
    ).url.endsWith("login=failed"),
  );
  assert.equal(exchanges, 0);
  for (const reason of ["nonce", "unverified", "signature"]) {
    badNonce = reason === "nonce";
    unverified = reason === "unverified";
    rejectToken = reason === "signature";
    await login.startGoogle();
    const result = await login.finishGoogle(
      request({ state: authParams.state, code: "test-code" }),
    );
    assert(result.url.endsWith("login=failed"));
    assert.equal(issued, null);
  }
  badNonce = false;
  unverified = false;
  rejectToken = false;
  await login.startGoogle();
  const state = authParams.state;
  const result = await login.finishGoogle(request({ state, code: "test-code" }));
  assert.equal(issued, "buyer@example.com");
  assert.equal(result.url, "https://clarea-three.vercel.app/account");
  const before = exchanges;
  await login.finishGoogle(request({ state, code: "test-code" }));
  assert.equal(exchanges, before);
  console.log(
    "PASS Google OAuth: fixed callback, minimal scopes, PKCE, state signature/expiry, cancellation, nonce, verified email, official ID-token verifier, cleared flow cookie and no open redirect",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
