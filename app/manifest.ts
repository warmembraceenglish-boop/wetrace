import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WETrace — Investigation & Intelligence",
    short_name: "WETrace",
    description: "Secure investigation, evidence, tracing and intelligence platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#071B2F",
    theme_color: "#071B2F",
    orientation: "any",
    icons: [
      { src: "/wetrace-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/wetrace-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/wetrace-icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
