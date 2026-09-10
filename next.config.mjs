import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @param {string} phase @returns {import('next').NextConfig} */
const nextConfig = (phase) => ({
  // Each local server needs its own cache; production assets stay in .next.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? `.next-dev-${process.env.PORT || "3000"}` : ".next",
  devIndicators: false,
  async headers() { return [{source: "/sw.js", headers: [{key: "Cache-Control", value: "no-cache, no-store, must-revalidate"}, {key: "Content-Type", value: "application/javascript; charset=utf-8"}]}]; },
  images: {
    unoptimized: true,
  },
});

export default nextConfig;
