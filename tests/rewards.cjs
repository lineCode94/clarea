const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3021";
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  fs.mkdirSync("test-results", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.addInitScript(() => {
      const original = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = (array) => {
        if (array instanceof Uint32Array && array.length === 1) {
          array[0] = 0;
          return array;
        }
        return original(array);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const alpha = await page.evaluate(async () => {
      const img = new Image();
      img.src = "/clarea-logo-transparent.png";
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, 1, 1).data[3];
    });
    assert.equal(alpha, 0, "Logo corner must be transparent");
    await page.getByRole("button", { name: "البحث عن المنتجات", exact: true }).click();
    assert.equal(
      await page.getByRole("searchbox").evaluate((e) => document.activeElement === e),
      true,
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/header-${width}.png` });
    await page.locator(".gift-tab").click();
    await page.locator(".gift-dialog").screenshot({ path: `test-results/wheel-${width}.png` });
    await page.getByLabel("أدخلي رقمك لتدوير العجلة").fill("01000000000");
    await page.getByRole("button", { name: "جرّبي حظك", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "العجلة بتدور…", exact: true }).isDisabled(),
      true,
    );
    const samples = await page.getByTestId("prize-wheel").evaluate(async (el) => {
      const values = [];
      for (let i = 0; i < 12; i++) {
        await new Promise(requestAnimationFrame);
        values.push(getComputedStyle(el).transform);
      }
      return values;
    });
    assert.ok(new Set(samples).size > 5, "Wheel must visibly rotate over consecutive frames");
    assert.equal(
      await page.getByTestId("gift-result").count(),
      0,
      "Result must wait for the wheel",
    );
    await page.getByTestId("gift-result").waitFor({ timeout: 35000 });
    const reference = await page.locator(".gift-dialog code").textContent();
    assert.match(reference, /^CL-[A-F0-9]{12}$/);
    const award = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("clarea-gift:clarea-welcome-v1")),
    );
    const ids = await page
      .locator("[data-prize-id]")
      .evaluateAll((elements) => elements.map((el) => el.dataset.prizeId));
    const angle = await page.getByTestId("prize-wheel").evaluate((e) => {
      const m = new DOMMatrix(getComputedStyle(e).transform);
      return (Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI) + 360) % 360;
    });
    assert.equal(
      angle,
      (360 - ids.indexOf(award.prizeId) * (360 / ids.length)) % 360,
      "Pointer and award must agree",
    );
    const claim = await page.locator(".gift-dialog a").getAttribute("href");
    assert.ok(decodeURIComponent(claim).includes(reference));
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".language-button").click();
    await page.locator(".gift-tab").click();
    assert.equal(await page.locator(".gift-dialog code").textContent(), reference);
    assert.equal(await page.getByRole("button", { name: "Try your luck", exact: true }).count(), 0);
    await page.keyboard.press("Escape");
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        })
        .map((e) => e.className),
    );
    assert.deepEqual(overflow, []);
    assert.deepEqual(errors, []);
    console.log(
      `${width}: transparent logo, search, spin, pointer, persistence, language, overflow passed`,
    );
    await context.close();
  }
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".gift-tab").click();
  await page.getByLabel("أدخلي رقمك لتدوير العجلة").fill("01000000000");
  await page.getByRole("button", { name: "جرّبي حظك", exact: true }).click();
  await page.waitForTimeout(1000);
  assert.equal(
    await page.getByTestId("gift-result").count(),
    0,
    "User-triggered spin must not skip its animation",
  );
  await page.getByTestId("gift-result").waitFor({ timeout: 35000 });
  console.log("Explicit spin retains its duration with reduced motion enabled");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
