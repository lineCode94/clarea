// UI regression: runs against a local build; Google responses are intercepted.
const { webkit } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://localhost:3072";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
(async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    for (const enabled of [true, false]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const sent = [];
      await page.route("**/api/chat", async (route) => {
        if (route.request().method() === "GET") return route.fulfill({ json: { enabled } });
        sent.push(route.request().postDataJSON());
        assert.equal(enabled, true);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return route.fulfill({
          json: {
            source: "gemini",
            answer: "اختيار التونر يعتمد على معلومات المنتج وتوفره. خلّيني أساعدك.",
            productIds: [],
            recommendations: [],
          },
        });
      });
      await page.goto(base);
      await page.waitForFunction(() => !document.querySelector("[inert]"));
      await page.getByRole("button", { name: "Open Claréa helper", exact: true }).click();
      const dialog = page.locator("dialog[open]");
      await dialog.getByRole("button", { name: "تغيير لغة المساعد للعربية" }).click();
      const input = dialog.getByRole("textbox"),
        question = "عاوزه تونر يناسب البشرة الحساسة";
      await input.fill(question);
      await dialog.getByRole("button", { name: "إرسال السؤال", exact: true }).click();
      if (enabled) {
        const activate = dialog.getByRole("button", {
          name: "عمري 18+ · فعّلي المساعد وأرسلي سؤالي",
          exact: true,
        });
        await activate.waitFor();
        assert.equal(sent.length, 0, "No Google request before consent");
        assert.equal(await input.inputValue(), question, "Keep original question");
        assert.equal(
          await dialog.getByRole("log").textContent(),
          "",
          "Do not substitute a generic FAQ",
        );
        const box = await activate.boundingBox();
        assert.ok(box.y >= 0 && box.y + box.height <= 844, "Consent CTA stays in viewport");
        await activate.click();
        await dialog.getByText("رد مولّد بواسطة Gemini", { exact: true }).waitFor();
        assert.equal(sent.length, 1);
        assert.equal(sent[0].message, question);
        assert.equal(sent[0].adultConfirmed, true);
        assert.equal(sent[0].consent, true);
        await input.fill("وإيه القوام؟");
        await dialog.getByRole("button", { name: "إرسال السؤال", exact: true }).click();
        await page.waitForFunction(
          () => document.querySelectorAll('dialog [role="log"]>div').length === 2,
        );
        assert.equal(sent.length, 2);
        assert.equal(sent[1].history[0].question, question);
        await dialog
          .getByRole("button", { name: "كيف أتابع المنتجات الجديدة؟", exact: true })
          .click();
        assert.equal(sent.length, 2);
        assert.match(await dialog.getByRole("log").textContent(), /New to Claréa/);
      } else {
        await dialog.getByText("المساعد الذكي مش متاح دلوقتي.", { exact: false }).waitFor();
        assert.equal(sent.length, 0);
        assert.ok(!(await dialog.getByRole("log").textContent()).includes("أرسلي لنا اسم المنتج"));
      }
      await page.close();
    }
    console.log(
      "PASS fresh-session consent regression: exact reported question retained, no generic skincare FAQ, explicit consent before AI, one-click send, follow-up context, local FAQ, clear disabled-service fallback.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
