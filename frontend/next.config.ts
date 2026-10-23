import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    BACKEND_RENDER_URL:
      process.env.BACKEND_RENDER_URL ||
      "https://gamified-coding-experience.onrender.com",
  },
};

export default nextConfig;
