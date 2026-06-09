import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jennabot.pro",
      },
      {
        protocol: "https",
        hostname: "flow-content.google",
      },
      {
        protocol: "https",
        hostname: "api.useapi.net",
      }
    ],
  },
};

export default nextConfig;
