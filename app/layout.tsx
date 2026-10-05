import type { Metadata } from "next";
import "./globals.css";
import "./flows.css";

export const metadata: Metadata = {
  title: "WETrace — Investigation & Intelligence",
  description: "International investigation, evidence, tracing and intelligence platform.",
  manifest: "/manifest.webmanifest",
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
