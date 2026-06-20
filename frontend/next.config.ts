import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the workspace root to /frontend — a stray package-lock.json at the
  // repo root otherwise makes Turbopack infer the wrong root and break
  // module resolution (e.g. "Can't resolve 'tailwindcss'").
  turbopack: { root: __dirname },
};

export default withNextIntl(nextConfig);
