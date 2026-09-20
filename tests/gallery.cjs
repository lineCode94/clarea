const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(process.env.TEST_BASE_URL || "http://localhost:3000", {
      waitUntil: "networkidle",
    });
    for (const lang of ["ar", "en"]) {
      if (lang === "en") await page.locator(".language-button").click();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator(".product-card").count(), 12);
      assert.equal(await page.locator("#collection [data-product-price]").count(), 0);
      await page.screenshot({ path: `test-results/gallery-${width}-${lang}.png` });
      const skin = page.locator("#collection").getByRole("button", {
        name: lang === "ar" ? "البشرة والوجه" : "Skin & face",
        exact: true,
      });
      await skin.click();
      await page.waitForTimeout(700);
      assert.equal(await page.locator(".product-card").count(), 12);
      await page.getByRole("checkbox").check();
      await page.waitForTimeout(700);
      assert.equal(await page.locator(".product-card").count(), 8);
      await page
        .getByRole("button", {
          name: lang === "ar" ? "عرض كل الاختيارات" : "View all selections",
          exact: true,
        })
        .click();
      await page.waitForTimeout(700);
      await page.getByRole("searchbox").fill("unknown-product");
      await page.waitForFunction(() => document.querySelectorAll(".product-card").length === 0);
      assert.equal(await page.locator(".product-card").count(), 0);
      await page.getByRole("searchbox").fill("");
      await page.waitForTimeout(700);
      await page.locator(".product-card button").first().click();
      assert.equal(await page.locator("dialog[open]").count(), 1);
      assert.equal(await page.locator('[data-product-details="travel-kit"]').count(), 1);
      await page
        .getByRole("button", { name: lang === "ar" ? "الصورة التالية" : "Next image", exact: true })
        .click();
      await page.waitForTimeout(600);
      await page.locator("dialog").screenshot({ path: `test-results/detail-${width}-${lang}.png` });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").count(), 0);
      for (const y of [900, 1800, 3000]) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(100);
      }
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const broken = await page.locator("img").evaluateAll(async (els) => {
        els.forEach((e) => {
          e.loading = "eager";
        });
        await Promise.all(els.map((e) => e.decode().catch(() => {})));
        return els.filter((e) => !e.complete || e.naturalWidth === 0).map((e) => e.src);
      });
      assert.deepEqual(broken, []);
      // Carousels and zoomed photos intentionally extend inside clipped containers.
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`${width}px ${lang}: filters, modal, images and overflow passed`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }
  }
  assert.deepEqual(errors, []);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
