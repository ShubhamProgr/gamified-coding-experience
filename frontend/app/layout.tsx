import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mars Rover — Gamified Programming",
  description:
    "Control a Mars Rover with code. Write Python to navigate the Martian surface, drill for resources, and complete missions in this gamified programming sandbox.",
  keywords: ["programming game", "Mars rover", "learn to code", "Python game", "gamified coding"],
  openGraph: {
    title: "Mars Rover — Gamified Programming",
    description: "Control a Mars Rover with code. Gamified coding sandbox.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ height: "100vh", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
