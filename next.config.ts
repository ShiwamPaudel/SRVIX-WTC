import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // Keeps Vercel's CDN from pinning a stale service worker. updateViaCache: "none" only governs the
  // browser's own HTTP cache; without this the edge can still hand back the previous /sw.js.
  // A headers entry is not a redirect, so this does not emit a 3xx.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
