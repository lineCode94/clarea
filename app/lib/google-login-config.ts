import "server-only";
export function googleLoginConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || "").length >= 32,
  );
}
export function customerSiteOrigin() {
  return new URL(process.env.CUSTOMER_SITE_URL || "https://clarea-three.vercel.app").origin;
}
