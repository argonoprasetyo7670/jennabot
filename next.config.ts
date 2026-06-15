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
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;
