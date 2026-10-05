import type { Metadata } from "next";
import "./globals.css";
import "./flows.css";

export const metadata: Metadata = {
  title: "WETrace — Investigation & Intelligence",
  description: "International investigation, evidence, tracing and intelligence platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/wetrace-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/wetrace-icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/wetrace-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/wetrace-icon.svg", type: "image/svg+xml" }
    ],
    apple: [
      { url: "/wetrace-icon-192.png", sizes: "192x192", type: "image/png" }
    ]
  },
  openGraph: {
    type: "website",
    siteName: "WETrace",
    title: "WETrace — Investigate • Trace • Intelligence • Worldwide",
    description: "International investigation, evidence, tracing and intelligence platform."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
