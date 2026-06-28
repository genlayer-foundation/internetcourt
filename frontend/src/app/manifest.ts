import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Internet Court",
    short_name: "Internet Court",
    description:
      "Agent-native dispute resolution for the AI agent economy, powered by GenLayer intelligent contracts.",
    start_url: "/",
    display: "standalone",
    theme_color: "#1a1817",
    background_color: "#ffffff",
    icons: [
      {
        src: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        src: "/apple-icon.png",
        type: "image/png",
        sizes: "256x256",
      },
    ],
  };
}
