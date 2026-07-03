import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Discovery Assistant — Spotify Review Intelligence",
  description: "Conversational AI Discovery Assistant powered by real user feedback, featuring an Adventurousness Slider and Contextual Mood Filtering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
