import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    BACKEND_RENDER_URL:
      process.env.BACKEND_RENDER_URL ||
      "https://mars-rover-backend.onrender.com",
  },
};

export default nextConfig;
