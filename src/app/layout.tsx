import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: "FOSLA Cyber Cafe, Mandi | Govt Job Alerts & Online Form Filling",
  description: "Seat-wise government job, result and admit card alerts on WhatsApp, plus online form filling, printing, scanning and more at FOSLA Cyber Cafe, Mandi, Himachal Pradesh.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090909" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
