import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropIntel — Real Estate Intelligence",
  description: "Machine learning property valuation and market intelligence platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
