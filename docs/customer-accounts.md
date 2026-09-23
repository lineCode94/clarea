# Customer order tracking and email sign-in

- `/track#<signed-token>` shows only reference, status, and last update. Tokens stay out of navigation requests and referrers; the API validates the signature before reading orders.
- `/account` links verified email addresses to matching orders. Phone-only guest orders remain accessible with their private tracking link; they are not attached to an email without verification.
- Checkout uses the signed-in email from the server session. The recent-orders list stores only references and tracking links on the current device, separately from the verified account.
- The admin bell polls pending storefront orders every 30 seconds while the dashboard is visible. Sound requires clicking Enable sound. This is not background push when the dashboard is closed.
- WhatsApp buttons open a draft with the current status and tracking link. The owner sends the message manually.

## Activate email verification

Set production environment variables in Vercel, then redeploy:

- `RESEND_API_KEY`: a Resend key with permission to send email.
- `CUSTOMER_EMAIL_FROM`: sender on your verified domain, e.g. `Clarea <orders@your-domain.example>`.
- `CUSTOMER_AUTH_SECRET`: optional stable random secret of at least 32 characters. Falls back to the existing `ADMIN_SESSION_SECRET`.

The sender domain must be verified in Resend: https://resend.com/docs/dashboard/domains/introduction
API: https://resend.com/docs/api-reference/emails/send-email

Without email configuration, tracking works and `/account` truthfully shows that email login is not yet available. No code is displayed or logged in production. OTPs expire in 10 minutes, allow five guesses, and are consumed atomically; a resend replaces the previous code. Sessions last seven days in HttpOnly, Secure production cookies. Changing the signing secret invalidates sessions; changing ADMIN_SESSION_SECRET also invalidates existing tracking links.

## Validation

`node tests/customer-auth.cjs` uses in-memory storage and mocked email delivery. It checks OTP expiry, hashed storage, cooldown, guess limits, one-use concurrency, secure cookies, session tampering, account isolation, logout and failed email delivery. `node tests/orders.cjs` covers tracking signature validation and public-data boundaries. Never create live test orders or send test messages to real customers.
