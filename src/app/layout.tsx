import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Dela_Gothic_One } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { config } from "@/lib/config";

const siteUrl = config.siteUrl;

// Normal / body text — Bricolage Grotesque (rendered bold italic via CSS)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// Bold / heading text — Dela Gothic One
const delaGothic = Dela_Gothic_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Blobbie Playground — Daily Rewards Draw & Airdrop Hub",
    template: "%s · Blobbie Playground",
  },
  description:
    "Blobbie is a Web3 reward ecosystem on BNB Chain. Join the Daily Rewards Draw and earn Airdrop Points in the Playground Beta. Built on BNB Chain with the $BLOBBIE BEP-20 token.",
  keywords: [
    "Blobbie",
    "BNB Chain",
    "BEP-20",
    "Daily Rewards Draw",
    "Airdrop",
    "Web3",
  ],
  openGraph: {
    title: "Blobbie Playground — Daily Rewards Draw & Airdrop Hub",
    description:
      "Transparent on-chain rewards on BNB Chain. Daily Rewards Draw + Airdrop Hub.",
    url: siteUrl,
    siteName: "Blobbie Playground",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blobbie Playground",
    description: "Daily Rewards Draw + Airdrop Hub on BNB Chain.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1c1d22",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${delaGothic.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
