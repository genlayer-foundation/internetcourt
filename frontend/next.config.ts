import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the workspace root to /frontend — a stray package-lock.json at the
  // repo root otherwise makes Turbopack infer the wrong root and break
  // module resolution (e.g. "Can't resolve 'tailwindcss'").
  turbopack: { root: __dirname },
  // Pin the workspace root for webpack/file-tracing too — a stray
  // package-lock.json at the repo root otherwise makes Next infer the wrong
  // root. Dev runs on webpack (`next dev --webpack`) because Turbopack dev
  // repeatedly corrupted its `.next/dev` cache under this project's compile
  // load (missing .sst / build-manifest / [turbopack]_runtime.js → 500s).
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      {
        // Canonicalize the www host to the apex (308), preserving the path.
        // Matches only the www host, so the apex and staging are untouched.
        source: "/:path*",
        has: [{ type: "host", value: "www.internetcourt.org" }],
        destination: "https://internetcourt.org/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // llms.txt is a machine-readable index for LLMs, not a page we want
        // surfaced in classic search results.
        source: "/llms.txt",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
