import type { NextConfig } from "next";

/** Apex → www so SEO and analytics see one canonical host (matches NEXT_PUBLIC_SITE_URL in prod). */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "laoshixu.com" }],
        destination: "https://www.laoshixu.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
