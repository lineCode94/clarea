const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const env = process.env;
if (!env.ADMIN_TEST_PASSWORD)
  throw new Error("Set ADMIN_TEST_PASSWORD for an isolated test instance");
const base = env.TEST_BASE_URL || "http://localhost:3047";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Mutation tests run only against a local isolated test instance");
const output = path.join(__dirname, "../test-results/admin");
fs.mkdirSync(output, { recursive: true });
const checks = [];
function pass(name) {
  checks.push(name);
  console.log("PASS " + name);
}
async function request(path, method = "GET", body, cookie, origin = base) {
  const headers = {};
  if (method !== "GET") headers.Origin = origin;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
(async () => {
  assert.equal((await request("/api/admin/products")).status, 401);
  assert.equal((await request("/api/admin/products", "PUT", {})).status, 401);
  assert.equal((await request("/api/admin/images", "POST")).status, 401);
  pass("Anonymous catalog reads, edits and image uploads are denied");
  assert.equal(
    (
      await request(
        "/api/admin/session",
        "POST",
        { password: env.ADMIN_TEST_PASSWORD },
        null,
        "https://example.org",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/admin/session", "POST", { password: "incorrect" })).status,
    401,
  );
  assert.equal(
    (await request("/api/admin/products", "GET", undefined, "clarea_admin=forged.signature"))
      .status,
    401,
  );
  pass("Cross-origin login, incorrect password and forged session denied");
  const browser = await chromium.launch({
    headless: true,
    ...(env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/admin");
    await page.waitForFunction(() => !document.querySelector("[inert]"));
    await page.getByLabel("كلمة المرور", { exact: true }).fill(env.ADMIN_TEST_PASSWORD);
    await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
    await page.getByRole("button", { name: "إضافة منتج", exact: true }).waitFor({ timeout: 60000 });
    await page.waitForFunction(
      () => !document.querySelector("button:disabled")?.textContent?.includes("إضافة منتج"),
    );
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "clarea_admin");
    assert(session && session.httpOnly && session.secure && session.sameSite === "Strict");
    const cookie = "clarea_admin=" + session.value;
    const before = await (await request("/api/admin/products", "GET", undefined, cookie)).json();
    assert(before.products.length > 10);
    assert.equal(before.version, "seed");
    pass("Mobile login succeeds with secure HttpOnly SameSite session; existing catalog preserved");
    await page.screenshot({ path: output + "/admin-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
    const productName = "Admin review " + Date.now();
    await page.getByLabel("اسم المنتج", { exact: true }).fill(productName);
    await page.getByLabel("الماركة", { exact: true }).fill("CLAREA TEST");
    await page.getByLabel("الوصف", { exact: true }).fill("منتج اختبار في مساحة تخزين منفصلة");
    await page.getByLabel("Description", { exact: true }).fill("Isolated review product");
    await page
      .locator("#product-images")
      .setInputFiles(path.join(__dirname, "../public/products/probio-ampoule.jpg"));
    await page.getByRole("button", { name: "حفظ كمسودة", exact: true }).waitFor();
    await page.getByRole("button", { name: "حفظ كمسودة", exact: true }).click({ timeout: 60000 });
    await page
      .getByRole("status")
      .filter({ hasText: "اتحفظ المنتج كمسودة" })
      .first()
      .waitFor({ timeout: 60000 });
    await page.screenshot({ path: output + "/admin-mobile-editor.png", fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    let catalog = await (await request("/api/admin/products", "GET", undefined, cookie)).json();
    const draft = catalog.products.find((p) => p.name === productName);
    assert(draft && !draft.published);
    assert.equal((await fetch(base + draft.images[0])).status, 200);
    assert(!(await (await fetch(base)).text()).includes(productName));
    pass("Mobile image upload and draft save succeed; draft excluded from public HTML");
    const response = await request(
      "/api/admin/products",
      "PUT",
      { product: { ...draft, published: true }, create: false, version: catalog.version },
      cookie,
    );
    assert.equal(response.status, 200);
    catalog = await response.json();
    assert((await (await fetch(base)).text()).includes(productName));
    const conflict = await request(
      "/api/admin/products",
      "PUT",
      { product: draft, create: false, version: "seed" },
      cookie,
    );
    assert.equal(conflict.status, 409);
    const invalid = await request(
      "/api/admin/products",
      "PUT",
      {
        product: { ...draft, images: ["//evil.example/image.png"] },
        create: false,
        version: catalog.version,
      },
      cookie,
    );
    assert.equal(invalid.status, 400);
    const cross = await request(
      "/api/admin/products",
      "PUT",
      { product: draft, create: false, version: catalog.version },
      cookie,
      "https://example.org",
    );
    assert.equal(cross.status, 403);
    pass(
      "Publishing appears on storefront; stale updates, unsafe image paths and CSRF edits rejected",
    );
    const parallel = await Promise.all(
      [1, 2].map((n) =>
        request(
          "/api/admin/products",
          "PUT",
          {
            product: { ...draft, label: { ar: "اختبار " + n, en: "Review " + n } },
            create: false,
            version: catalog.version,
          },
          cookie,
        ),
      ),
    );
    assert.deepEqual(parallel.map((r) => r.status).sort(), [200, 409]);
    assert(!(await (await fetch(base)).text()).includes(productName));
    pass("Concurrent updates cannot overwrite one another; hiding removes product from storefront");
    const form = new FormData();
    form.append("file", new Blob(["not an image"], { type: "image/png" }), "invalid.png");
    assert.equal(
      (
        await fetch(base + "/api/admin/images", {
          method: "POST",
          headers: { Origin: base, Cookie: cookie },
          body: form,
        })
      ).status,
      400,
    );
    pass("Invalid image content rejected");
    const adminResponse = await fetch(base + "/admin");
    assert.match(adminResponse.headers.get("x-robots-tag"), /noindex/);
    assert.match(adminResponse.headers.get("cache-control"), /no-store/);
    assert.match(await (await fetch(base + "/robots.txt")).text(), /Disallow: \/admin/);
    const publicPage = await context.newPage();
    await publicPage.goto(base);
    await publicPage.locator(".product-card").first().waitFor();
    assert.equal(await publicPage.locator('a[href*="admin"]').count(), 0);
    const reviewCards = await publicPage.locator("#collection .product-card").count();
    const live = await context.newPage();
    await live.goto("https://clarea-three.vercel.app");
    await live.locator(".product-card").first().waitFor();
    assert.equal(reviewCards, await live.locator("#collection .product-card").count());
    for (const p of [live, publicPage]) {
      await p.waitForFunction(() => !document.querySelector("[inert]"));
      await p.evaluate(() => document.fonts.ready);
    }
    await live.screenshot({ path: output + "/storefront-before-mobile.png" });
    await publicPage.screenshot({ path: output + "/storefront-after-mobile.png" });
    pass(
      "Public catalog count matches live site; no admin links; admin pages unindexed and uncached",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/admin");
    await page.getByRole("button", { name: "إضافة منتج", exact: true }).waitFor();
    await page.screenshot({ path: output + "/admin-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "خروج", exact: true }).click();
    await page.getByRole("button", { name: "دخول لوحة الإدارة" }).waitFor();
    assert(!(await context.cookies()).some((c) => c.name === "clarea_admin"));
    pass("Logout removes session; desktop layout rendered");
    for (let i = 0; i < 8; i++)
      assert.equal(
        (await request("/api/admin/session", "POST", { password: "wrong" })).status,
        401,
      );
    assert.equal((await request("/api/admin/session", "POST", { password: "wrong" })).status, 429);
    assert.equal(errors.length, 0, errors.join("\n"));
    pass("Persistent login throttling works; no browser runtime errors");
    fs.writeFileSync(
      output + "/checks.json",
      JSON.stringify({ checks, productCount: before.products.length, passed: true }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
