import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Django routes end in "/". Next would otherwise 308-redirect those requests
  // to the slash-less form, which breaks POST bodies once proxied.
  skipTrailingSlashRedirect: true,
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/media/:path*", destination: `${BACKEND_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;
