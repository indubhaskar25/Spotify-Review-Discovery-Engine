import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotify Compass — AI Discovery Companion",
  description: "An AI-powered music discovery companion that helps listeners break out of repetitive listening patterns and discover new music through context, intent, and exploration control.",
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
