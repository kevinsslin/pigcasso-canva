import type { Metadata } from "next";
import { Noto_Sans_TC, Nunito } from "next/font/google";
import { Modals } from "@/components/modals";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-tc",
  weight: ["400", "500", "700"],
});

export const dynamic = "force-dynamic";

const ICON_VERSION = "20260129";

export const metadata: Metadata = {
  title: "Pigcasso Canvas",
  description: "Web3-native design editor with token-gated Pro on Mantle.",
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_VERSION}` },
      { url: `/icon.png?v=${ICON_VERSION}`, type: "image/png" },
    ],
    apple: [{ url: `/apple-icon.png?v=${ICON_VERSION}` }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${notoSansTc.variable}`}>
        <Providers>
          <Toaster />
          <Modals />
          {children}
        </Providers>
      </body>
    </html>
  );
}
