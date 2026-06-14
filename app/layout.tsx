import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cool Jam · 수면을 위한 사운드",
  description:
    "잠 못 드는 밤을 위한 백색 소음, 호흡 가이드, 수면 타이머. 차분하게 잠들 수 있도록 도와드려요.",
};

export const viewport: Viewport = {
  themeColor: "#0b1026",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
