import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for server deployment (PM2/Docker)
  output: "standalone",
};

export default nextConfig;
