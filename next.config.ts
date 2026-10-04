import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};
export default nextConfig;
