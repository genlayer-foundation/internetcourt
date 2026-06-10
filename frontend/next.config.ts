import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to /frontend — a stray package-lock.json at the
  // repo root otherwise makes Turbopack infer the wrong root and break
  // module resolution (e.g. "Can't resolve 'tailwindcss'").
  turbopack: { root: __dirname },
};

export default nextConfig;
