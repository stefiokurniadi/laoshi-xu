import type { NextConfig } from "next";

/** Apex → www so SEO and analytics see one canonical host (matches NEXT_PUBLIC_SITE_URL in prod). */
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@vercel/analytics", "@vercel/speed-insights"],
  },
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
  /** Browsers request `/favicon.ico` by default; serve the real logo so the Vercel placeholder isn’t used. */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/laoshi-xu-logo.png" }];
  },
};

export default nextConfig;
