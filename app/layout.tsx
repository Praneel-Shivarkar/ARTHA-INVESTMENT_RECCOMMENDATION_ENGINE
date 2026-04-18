import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artha - AI-Powered Investment Planning System",
  description: "Deterministic investment planning engine with AI extraction and explanation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
