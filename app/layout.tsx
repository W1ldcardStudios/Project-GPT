import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project GPT — Local AI Study Assistant",
  description: "A browser-powered AI study assistant.",
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
