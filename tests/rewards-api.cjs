const fs = require("fs");
const assert = require("assert/strict");
const { randomUUID } = require("crypto");
const env = require("util").parseEnv(fs.readFileSync(process.argv[2], "utf8"));
assert.match(env.CATALOG_NAMESPACE, /^rewards-test-/);
const base = process.argv[3];
assert.ok(
  base && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base),
  "Only an isolated local test server is allowed",
);
let cookie = "";
async function post(path, data, auth = false, origin = base) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(auth ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
  });
  const body = await r.json();
  return { status: r.status, body, headers: r.headers };
}
const spin = (phone, requestId = randomUUID()) => post("/api/rewards/spin", { phone, requestId });
const check = (code) => post("/api/admin/rewards", { action: "check", code }, true);
async function win(phone) {
  for (let i = 0; i < 5; i++) {
    const r = await spin(phone);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    if (r.body.reference) return r.body;
  }
  throw new Error("Five try-again results; rerun in a fresh test namespace");
}
(async () => {
  assert.equal((await post("/api/admin/rewards", { action: "check", code: "fake" })).status, 401);
  assert.equal(
    (
      await post(
        "/api/rewards/spin",
        { phone: "01000000000", requestId: randomUUID() },
        false,
        "https://attacker.example",
      )
    ).status,
    403,
  );
  for (const phone of [
    "+966501234567",
    "+971501234567",
    "+12025550123",
    "01312345678",
    "0101234567",
    "010123456789",
    "not-a-phone",
  ])
    assert.equal((await spin(phone)).status, 400, "Non-Egyptian or malformed accepted: " + phone);
  assert.equal(
    (
      await post("/api/rewards/spin", {
        phone: "01000000000",
        requestId: randomUUID(),
        prizeId: "save-10",
      })
    ).status,
    400,
  );
  console.log(
    "PASS authentication, same-origin, Egyptian-only validation and rejection of client-selected prizes.",
  );
  const login = await post("/api/admin/session", { password: env.ADMIN_TEST_PASSWORD });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  const first = await win("01000000000");
  assert.match(first.reference, /^CL2-[A-F0-9]{24}$/);
  for (const phone of ["+201000000000", "00201000000000", "٠١٠٠٠٠٠٠٠٠٠"]) {
    const r = await spin(phone);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, first);
  }
  let r = await check(first.reference.toLowerCase());
  assert.equal(r.body.status, "valid");
  assert.equal(r.body.award.prizeId, first.prizeId);
  assert.equal(r.body.award.phone, "+201000000000");
  assert.equal(r.body.award.usedAt, null);
  assert.equal(r.body.key, undefined);
  assert.equal(r.body.etag, undefined);
  assert.equal((await check("CL2-" + "0".repeat(24))).body.status, "invalid");
  assert.equal((await check("CL-0123456789AB")).body.status, "legacy");
  console.log(
    "PASS one winning code per normalized phone across requests, authoritative prize, invalid and legacy detection.",
  );
  const redeem = {
    action: "redeem",
    code: first.reference,
    phone: "01000000000",
    orderReference: "ISOLATED-TEST-ORDER",
  };
  assert.equal(
    (await post("/api/admin/rewards", { ...redeem, phone: "01100000000" }, true)).status,
    409,
  );
  assert.equal((await check(first.reference)).body.status, "valid");
  const parallel = await Promise.all([
    post("/api/admin/rewards", redeem, true),
    post("/api/admin/rewards", redeem, true),
  ]);
  assert.deepEqual(parallel.map((x) => x.status).sort(), [200, 409]);
  r = await check(first.reference);
  assert.equal(r.body.status, "used");
  assert.equal(r.body.award.orderReference, "ISOLATED-TEST-ORDER");
  assert.ok(r.body.award.usedAt);
  assert.equal((await post("/api/admin/rewards", redeem, true)).status, 409);
  const after = await spin("01000000000");
  assert.deepEqual(after.body, first);
  console.log(
    "PASS phone mismatch rejected, verification does not consume code, simultaneous redemption succeeds exactly once, repeat use rejected.",
  );
  const requestId = randomUUID();
  const pair = await Promise.all([spin("01100000000", requestId), spin("01100000000", requestId)]);
  for (const p of pair) assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.deepEqual(pair[0].body, pair[1].body);
  console.log("PASS concurrent identical spin requests return the same result.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
