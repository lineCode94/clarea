# Optional email accounts (Firebase Spark)

Guest checkout requires delivery name, phone and address, never an account. Email is optional. The receipt provides a signed private tracking link and a copy button; this browser remembers recent links. Anyone holding the link can see only the reference/status/timestamp, not customer identity or financial data. Clearing browser storage removes this device's saved links. The saved link still works on another device. No automatic email/SMS delivery is implied.

An authenticated customer sees orders placed with their verified email; a guest can enter that email at checkout and verify it later. Orders placed without an email remain available through their private links, not automatically attached to a later account.

## Activation
1. Create/add a Firebase project on Spark (no Billing needed).
2. Authentication > Sign-in method > Email/Password: enable.
3. Authentication > Settings > Authorized domains: add `clarea-three.vercel.app`.
4. Project settings > General > Web app: obtain the Web API key.
5. Add `FIREBASE_WEB_API_KEY` to Vercel Production environment; redeploy.
6. Configure the Firebase verification/password-reset email templates and enable email-enumeration protection. The default Firebase action handler/domain handles verification links; no owned sending domain is required.
7. Test signup, verification link, returning to sign in, password reset and logout using your own test address. Do not activate SMS or upgrade to Blaze for this workflow.

The server calls Firebase REST over HTTPS, validates verified email with `accounts:lookup`, and issues the existing HTTP-only customer session only after verified identity. Provider tokens/passwords are not persisted or returned to the browser. Requests enforce same origin, strict bounded inputs and persistent rate limits. No service-account private key is required.

Checks: `node tests/firebase-email.cjs`, `node tests/customer-auth.cjs`, `node tests/orders.cjs`.
