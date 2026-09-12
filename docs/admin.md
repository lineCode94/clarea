# Private product administration

Open /admin directly. No administration link is added to the public storefront. Sign in with the owner's password. Upload product images, fill Arabic and English descriptions, then save a draft or enable publication. Availability is independent of publication. First image is the cover. Up to six images, 3 MB each (JPEG, PNG, WebP).

The public store reads only published catalog entries from private Vercel Blob storage. Existing products are the initial catalog until the first save. Uploaded images are re-encoded as WebP and served through an opaque image URL. Draft product records never enter the storefront response. Publication changes appear on the next page load. Authentication uses a 12-hour signed HttpOnly/Secure/SameSite cookie. Admin mutations require authentication and matching Origin. Login throttling persists in private storage. Conditional writes prevent stale and concurrent overwrites.

Required production environment variables: BLOB_READ_WRITE_TOKEN, ADMIN_PASSWORD_HASH (scrypt salt:hash), ADMIN_SESSION_SECRET (at least 32 characters). CATALOG_NAMESPACE defaults to clarea. Credentials are not committed. Rotate the password hash and session secret together to invalidate existing sessions.

## Verification

Production build and TypeScript passed. Real API/browser tests used a separate admin-test namespace, never the production catalog. Checks: Anonymous catalog reads, edits and image uploads are denied; Cross-origin login, incorrect password and forged session denied; Mobile login succeeds with secure HttpOnly SameSite session; existing catalog preserved; Mobile image upload and draft save succeed; draft excluded from public HTML; Publishing appears on storefront; stale updates, unsafe image paths and CSRF edits rejected; Concurrent updates cannot overwrite one another; hiding removes product from storefront; Invalid image content rejected; Public catalog count matches live site; no admin links; admin pages unindexed and uncached; Logout removes session; desktop layout rendered; Persistent login throttling works; no browser runtime errors. Existing storefront catalog: 17 products. Mobile before/after screenshots matched visually. Existing storefront design, WhatsApp, gifts and installation controls remain unchanged.

## Rollback

Baseline commit: 5d2e36c (Save storefront before private product admin).
Previous production deployment: https://clarea-cosmetics-2z3lh8svh-linecode94s-projects.vercel.app
Previous deployment ID: dpl_4gFH6S39FnunFxsx1dtx1jc2J8mx

To restore traffic, run from this project: npx vercel rollback https://clarea-cosmetics-2z3lh8svh-linecode94s-projects.vercel.app --yes
For a source rollback, revert the separate admin implementation commit and deploy. Do not reset unrelated work. Blob data is retained by either rollback; the old static storefront will not display products subsequently added in the admin panel. Restoring the admin deployment reconnects that retained catalog.

ETag handling follows conditional writes in https://vercel.com/docs/vercel-blob with the weak HTTP prefix removed when compressed reads return it; verified against actual private storage.

Repeatable test: tests/admin.cjs. Start a production-mode local instance with a fresh CATALOG_NAMESPACE beginning admin-test-, temporary ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET, and the linked storage token. Set ADMIN_TEST_PASSWORD and TEST_BASE_URL only in the test process, then run node tests/admin.cjs. Never use the production namespace for mutation tests.
