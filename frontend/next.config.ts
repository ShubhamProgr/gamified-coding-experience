import type { NextConfig } from "next";

const backendProxyTarget = (
  process.env.BACKEND_PROXY_URL ||
  process.env.BACKEND_RENDER_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_RENDER_URL ||
      "https://mars-rover-backend.onrender.com",
    BACKEND_RENDER_URL:
      process.env.BACKEND_RENDER_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "https://mars-rover-backend.onrender.com",
  },
  async rewrites() {
    if (!isDev) return [];
    return [
      { source: "/auth/:path*", destination: `${backendProxyTarget}/auth/:path*` },
      { source: "/games/:path*", destination: `${backendProxyTarget}/games/:path*` },
      { source: "/algo-battle/:path*", destination: `${backendProxyTarget}/algo-battle/:path*` },
      { source: "/ws/:path*", destination: `${backendProxyTarget}/ws/:path*` },
      { source: "/run", destination: `${backendProxyTarget}/run` },
      { source: "/health", destination: `${backendProxyTarget}/health` },
      { source: "/docs", destination: `${backendProxyTarget}/docs` },
      { source: "/openapi.json", destination: `${backendProxyTarget}/openapi.json` },
    ];
  },
};

export default nextConfig;
