import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, UnifrakturCook, Alegreya } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Blackletter for the wordmark, old-style serif for dates/kickers/buttons.
const unifraktur = UnifrakturCook({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "700",
});

const alegreya = Alegreya({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Jones House Cup — Family Tournament Standings",
  description: "Standings, recent results, and rivalries for family game night.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${manrope.variable} ${unifraktur.variable} ${alegreya.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
