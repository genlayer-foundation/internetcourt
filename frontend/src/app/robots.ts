import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/i18n-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI-search / user-facing answer-engine bots. These fetch pages to cite
      // them in live answers (ChatGPT, Claude, Perplexity, Apple) rather than
      // to train models — explicitly welcomed for maximum discoverability.
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Applebot",
        ],
        allow: "/",
      },
      // Everything else.
      {
        userAgent: "*",
        allow: "/",
      },
      // ---------------------------------------------------------------------
      // AI TRAINING CRAWLERS.
      // Currently ALLOWED for maximum reach. To adopt an IP-control posture,
      // change `allow: "/"` to `disallow: "/"` below.
      // ---------------------------------------------------------------------
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "Bytespider",
          "Meta-ExternalAgent",
        ],
        allow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
