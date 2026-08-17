import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessPath — Evidence-backed accessible journeys",
  description:
    "Verify accessibility evidence, expose uncertainty, and replan around barriers before you travel.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f1e8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
