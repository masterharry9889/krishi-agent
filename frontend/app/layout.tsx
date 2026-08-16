import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Krishi Agent — Season-long intelligence for every acre",
  description:
    "A multi-agent orchestration pipeline that guides farmers through soil diagnostics, crop selection, budget planning, real-time monitoring, and market linkage — backed by Soil Health Card, Agmarknet, satellite NDVI, PMFBY, and live mandi data.",
  keywords: [
    "precision agriculture", "LangGraph", "farmer AI", "Agmarknet",
    "Soil Health Card", "PMFBY", "NDVI", "e-NAM", "kisan", "krishi", "FPO", "mandi prices",
  ],
  openGraph: {
    title: "Krishi Agent — Season-long intelligence for every acre",
    description:
      "A multi-agent pipeline covering the full crop lifecycle: onboarding → soil → weather → crop pick → budget → monitoring → sell-timing.",
    type: "website",
    locale: "en_IN",
    siteName: "Krishi Agent",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Krishi Agent" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Krishi Agent",
    description: "Soil Health Card + Agmarknet + satellite NDVI + PMFBY — one pipeline, one season.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://krishiagent.in"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
