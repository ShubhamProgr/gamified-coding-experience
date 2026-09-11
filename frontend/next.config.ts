import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    NEXT_PUBLIC_BACKEND_RENDER_URL: process.env.BACKEND_RENDER_URL || process.env.NEXT_PUBLIC_BACKEND_RENDER_URL || "",
  },
};

export default nextConfig;
