const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = process.env.TEST_SOURCE_ROOT || path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/typescript"));
const env = { GEMINI_API_KEY: "test-key-not-a-real-secret" };
let reply, observed;
const moduleObject = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(root + "/app/lib/gemini-chat.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, {
  exports: moduleObject.exports,
  require(name) {
    if (name === "server-only") return {};
    if (name === "zod") return require(path.join(root, "node_modules/zod"));
    if (name === "../content/catalog")
      return {
        text: {
          ar: { faqs: [["جديد", "New to Claréa"]] },
          en: { faqs: [["New", "New to Claréa"]] },
        },
      };
    throw new Error(name);
  },
  process: { env },
  AbortSignal,
  fetch: async (url, init) => {
    observed = { url, ...init };
    if (reply instanceof Error) throw reply;
    return { ok: reply.ok !== false, json: async () => reply };
  },
});
const api = moduleObject.exports,
  input = {
    message: "What is a lightweight texture?",
    lang: "en",
    adultConfirmed: true,
    consent: true,
  };
const products = [
  {
    id: "public-one",
    name: "Public",
    brand: "Test",
    category: "skin",
    published: true,
    available: true,
    newArrival: true,
    label: { en: "Public" },
    description: { en: "A lightweight texture." },
  },
  { id: "secret-draft", name: "PRIVATE DRAFT", published: false },
];
function respond(value, finishReason = "STOP") {
  reply = { candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(value) }] } }] };
}
(async () => {
  assert.equal(api.chatInput.safeParse({ ...input, adultConfirmed: false }).success, false);
  assert.equal(api.chatInput.safeParse({ ...input, consent: false }).success, false);
  assert.equal(api.chatInput.safeParse({ ...input, message: "a".repeat(501) }).success, false);
  for (const msg of [
    "my phone 01000000001",
    "hello@example.com",
    "رقمي ٠١٠٠٠٠٠٠٠٠١",
    "عندي حساسية",
    "my order status",
  ])
    assert.equal(api.localOnly(msg), true, msg);
  respond({ answer: "Explore the lightweight texture.", productIds: ["public-one"] });
  const ok = await api.generateReply(input, products);
  assert.equal(ok.source, "gemini");
  assert.equal(ok.productIds[0], "public-one");
  assert.match(observed.url, /generativelanguage.googleapis.com/);
  assert.equal(observed.headers["x-goog-api-key"], env.GEMINI_API_KEY);
  assert.equal(observed.cache, "no-store");
  const body = JSON.parse(observed.body);
  assert.ok(!observed.body.includes("PRIVATE DRAFT"));
  assert.ok(!observed.body.includes("secret-draft"));
  assert.equal(body.generationConfig.maxOutputTokens, 600);
  assert.equal(body.tools, undefined);
  respond({ answer: "Invented", productIds: ["secret-draft"] });
  assert.equal((await api.generateReply(input, products)).source, "saved");
  respond({ answer: "Too long".repeat(300), productIds: [] });
  assert.equal((await api.generateReply(input, products)).source, "saved");
  respond({ answer: "Blocked", productIds: [] }, "SAFETY");
  assert.equal((await api.generateReply(input, products)).source, "saved");
  reply = { ok: false, status: 429 };
  assert.equal((await api.generateReply(input, products)).source, "saved");
  reply = new Error("timeout");
  assert.equal((await api.generateReply(input, products)).source, "saved");
  assert.equal(api.localOnly("انا عاوزه اشتري toner للبشرة الحساسة"), false);
  assert.equal(
    api.chatInput.safeParse({ ...input, history: Array(5).fill({ question: "q", answer: "a" }) })
      .success,
    false,
  );
  const reference = api.recommendationReferences[0];
  respond({
    answer: "This is an outside suggestion. Check availability on WhatsApp.",
    productIds: [],
    externalProductIds: [reference.id],
  });
  const outside = await api.generateReply(
    {
      ...input,
      history: [{ question: "I need a toner", answer: "Which skin type?" }],
      message: "Sensitive skin",
    },
    products,
  );
  assert.equal(outside.source, "gemini");
  assert.equal(outside.recommendations[0].source, reference.source);
  assert.equal(
    JSON.parse(JSON.parse(observed.body).contents[0].parts[0].text).history[0].question,
    "I need a toner",
  );
  const stock = [...products, { ...products[0], id: "purito-stock", name: reference.name }];
  assert.equal(
    (await api.generateReply(input, stock)).source,
    "saved",
    "An already-listed item must not be presented as external",
  );
  respond({ answer: "Fabricated", productIds: [], externalProductIds: ["invented"] });
  assert.equal((await api.generateReply(input, products)).source, "saved");
  respond({ answer: "For sensitive skin, review this toner.", productIds: ["public-one"] });
  const detailed = [
    {
      ...products[0],
      details: {
        skinType: { en: "Sensitive" },
        ingredients: { en: ["Panthenol"] },
        caution: { en: "Individual tolerance varies" },
        contents: { en: ["Toner"] },
        size: "200ml",
      },
    },
  ];
  assert.equal((await api.generateReply(input, detailed)).source, "gemini");
  const sent = JSON.parse(JSON.parse(observed.body).contents[0].parts[0].text).catalog[0];
  assert.equal(sent.skinType, "Sensitive");
  assert.equal(sent.ingredients[0], "Panthenol");
  assert.equal(sent.caution, "Individual tolerance varies");
  delete env.GEMINI_API_KEY;
  assert.equal((await api.generateReply(input, products)).source, "saved");
  console.log(
    "PASS Gemini contract: adult/consent schema, sensitive-query checks, private drafts excluded, published IDs validated, bounded output and safe quota/timeout/missing-key fallbacks. Provider responses mocked; no live API calls.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
