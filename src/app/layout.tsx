import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Baseline — Basketball Career OS",
  description:
    "An adaptive basketball development platform. Every day it tells you exactly what to do — and it's right.",
  applicationName: "Baseline",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Baseline", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-full">
        <div className="mx-auto min-h-full w-full max-w-md px-5 pt-6">{children}</div>
        <BottomNav />
        <RegisterSW />
      </body>
    </html>
  );
}
