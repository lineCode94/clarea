# Clarea

The standalone website lives in `D:\clarea`. Nothing in this project depends on the previous cosmetics workspace or Codex runtime paths.

Next.js App Router, TypeScript, Tailwind CSS v4, Framer Motion, React Icons. Arabic and English catalog with availability filtering and native-dialog product previews.

## Start Development

```powershell
cd D:\clarea
pnpm install
pnpm dev
```

Open the Local URL printed by Next.js. Use `pnpm dev --port 3021` when 3000 is occupied.

## Where To Edit

| Change                                                | File                                         |
| ----------------------------------------------------- | -------------------------------------------- |
| Add products, change stock, descriptions or images    | `app/data/products.ts`                       |
| Product type and supported languages                  | `app/types/catalog.ts`                       |
| WhatsApp number, Instagram and TikTok URLs            | `app/config/site.ts`                         |
| Catalog text in Arabic and English                    | `app/content/catalog.ts`                     |
| Footer text in Arabic and English                     | `app/content/footer.ts`                      |
| Fonts, brand color, global typography and page width  | `app/globals.css`                            |
| Page title and SEO description                        | `app/layout.tsx`                             |
| Page composition and language/selected-product state  | `app/components/catalog-page.tsx`            |
| Search, category, stock and sort logic                | `app/hooks/use-catalog-filters.ts`           |
| Search input, tabs and sort controls                  | `app/components/catalog/catalog-toolbar.tsx` |
| Grid and enter/exit/reorder animation                 | `app/components/catalog/product-catalog.tsx` |
| Product image, hover animation and card text          | `app/components/catalog/product-card.tsx`    |
| Product modal, image navigation and detail accordions | `app/components/catalog/product-dialog.tsx`  |
| Header and footer                                     | `app/components/layout/`                     |
| Intro, editorial, about and FAQ sections              | `app/components/sections/`                   |
| Cleansing duo ingredients, usage and FAQ              | `app/data/cleansing.ts`                      |
| Product images, logos and fonts                       | `public/`                                    |

`app/page.tsx` only renders `CatalogPage`. Data and translations do not live inside the page. Components use Tailwind classes; shared colors are named theme tokens such as `text-brand` and `bg-brand`.

## Add A Product

1. Put the images in `public/`, for example `public/new-serum.webp`.
2. Add a record to `products` in `app/data/products.ts` with a unique `id`.
3. Set `category` to `skin` or `hair` and provide Arabic/English `label` and `description`.
4. Set `images` to public paths such as `["/new-serum.webp"]`.
5. Set `available: true` only for confirmed stock. Unavailable products offer an availability enquiry instead of an order CTA.

Filters, search, counts, and the preview pick up the new record automatically. The featured cleansing duo in `editorial-section.tsx` is referenced by its ID, not array position.

## Contact Settings

The WhatsApp number and social URLs in `app/config/site.ts` are placeholders. Replace them before publishing. `app/lib/whatsapp.ts` creates localized, product-specific links; no messages are sent automatically.

## Checks

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm build
```

For browser checks, start the website in a separate terminal, then:

```powershell
pnpm exec playwright install chromium
$env:TEST_BASE_URL = "http://localhost:3000"
pnpm test:e2e
```

The tests cover both languages, four viewport widths, filters, empty results, image navigation, modal closing, loaded assets, and horizontal overflow. Screenshots go to `test-results/`. To use an installed Chrome instead of Playwright Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

## Production

```powershell
pnpm build
pnpm start
```

Development uses `.next-dev-PORT`; production uses `.next`. Generated caches, dependencies, and screenshots are excluded from Git.

## Product Content And Assets

## Gift Wheel

`app/config/rewards.ts` contains the campaign ID, proposed gifts, colors and bilingual terms. Each segment has an equal chance. The UI and translations are in `app/components/rewards/` and `app/content/rewards.ts`; persistence lives in `app/hooks/use-gift-wheel.ts`.

Rewards are issued server-side and recorded in private Vercel Blob storage. Configure a persistent, independent `REWARDS_SECRET` (at least 32 random characters), along with the existing Blob token and admin credentials. Do not rotate it during a campaign: phone-record keys use this secret. Egyptian mobile numbers are normalized to +20, so local, international and Arabic-digit forms share one winning code per campaign. Clearing browser storage or using another device does not grant another winning code. Try Again has no code and permits another attempt. The browser cache is only for display.

Authenticated staff can open `/admin/rewards` or “فحص أكواد الهدايا” in the sidebar to inspect a code. Verification does not consume it. Redemption requires a matching customer phone number and an order reference; conditional storage writes prevent simultaneous double redemption. Codes generated before this release (`CL-…`) have no authoritative record and require manual review. New `CL2-…` codes are checked against both their index and canonical record.

Numbers are format-checked, not verified by SMS. Match the entry phone to the actual customer/order before redemption; this does not prevent someone using several different numbers. Per-IP and global request limits reduce automated issuance. Storage errors fail closed. Public requests cannot choose the prize or create a usable code in local storage. Prize probabilities and the WhatsApp confirmation flow are unchanged.

For isolated API regression checks, run `node tests/rewards-api.cjs PATH_TO_REVIEW_ENV http://localhost:PORT`. The review environment must use a separate `rewards-test-…` namespace and include `ADMIN_TEST_PASSWORD`. The test creates and redeems test codes; never target production.

The new transparent logo is `public/clarea-logo-transparent.png`. The floating WhatsApp link uses `app/config/site.ts`. The header has working search, category and gift controls, without placeholder account or cart actions.

The three WebP product photos were supplied by the owner. Additional product-only packshots came from SKIN1004's official Shopify CDN; source pages are recorded in the product data. Additional selections are explicitly unavailable, not confirmed future inventory. Review the cleansing duo's ingredients against the supplied packaging before publishing.

## Optional Gemini shopping assistant

The helper retains local FAQs and product search. New arrivals point to the homepage's New to Claréa section. Unmatched questions can use Gemini 2.5 Flash-Lite through the server-only /api/chat route, after an explicit 18+ declaration and consent. This declaration is not age verification. The owner must ensure the AI audience satisfies Google's API age requirements; an adult purchaser alone does not establish this.

Set GEMINI_API_KEY as a sensitive Production variable on Vercel, using a Google AI Studio project on the free tier with no billing enabled. Set GEMINI_ENABLED=true only when ready to activate, then redeploy. GEMINI_MODEL optionally overrides gemini-2.5-flash-lite. The existing ADMIN_SESSION_SECRET and BLOB_READ_WRITE_TOKEN support persistent request limits. Without configuration the helper remains fully local; it does not advertise AI. Never put the key in NEXT_PUBLIC variables or client code.

Free quota varies by model/project. The app limits upstream requests to 10 per IP/hour and 40 globally per rolling day, and returns a saved fallback on rate limits, missing keys, blocked/malformed output or timeouts. These caps do not make a billing-enabled Google project free. There is no paid-provider fallback. Turn off GEMINI_ENABLED and redeploy to disable AI.

The current question, up to four previous AI exchanges, and up to 40 relevant published products (including documented skin types, ingredients and cautions) are sent; no private drafts, customer records or reward records are accessed. History is bounded and sensitive previous questions cause a local reply. Questions and answers are kept only in browser memory, not stored by this app. Google may use free-tier input/output to improve its services. The UI discloses this and asks users not to enter personal/health data; obvious sensitive queries stay local, but keyword checks cannot guarantee all sensitive text is detected.

Responses are plain text with validated public product IDs. Nuanced product questions reach Gemini instead of being intercepted by general purchase/skincare keywords. Recommendations prioritize documented suitable in-stock products; unavailable items are marked in their cards. Outside-catalog suggestions are restricted to curated manufacturer references (currently PURITO Wonder Releaf Centella Toner Unscented, reviewed 2026-09-13); the server resolves their names/source links and always labels availability unconfirmed. Other missing product types are described without invented product names. WhatsApp links prefill the question or exact external product name; clicking does not send a message automatically. The model cannot place orders, issue/redeem codes or mutate data. Prices and shipping are confirmed through WhatsApp. Product grounding reduces but does not eliminate incorrect model statements.

Run node tests/gemini.cjs for schema, privacy checks, catalog filtering, response-ID validation and quota/timeout fallback tests. These use mocked provider responses; a live smoke test is still needed after supplying a real key.
