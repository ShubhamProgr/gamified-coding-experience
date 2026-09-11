import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    BACKEND_RENDER_URL: process.env.BACKEND_RENDER_URL || "http://localhost:8000",
  },
};

export default nextConfig;
