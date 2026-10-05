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
    orientation: "any"
  };
}
