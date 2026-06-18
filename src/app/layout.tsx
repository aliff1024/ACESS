import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Acess App - Accessibility Learning Platform",
  description: "Learn accessibility with interactive courses",
  icons: [
    { rel: 'icon', url: '/light-favicon.png', media: '(prefers-color-scheme: light)' },
    { rel: 'icon', url: '/dark-favicon.png', media: '(prefers-color-scheme: dark)' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Accessibility Presets: Load Atkinson Hyperlegible from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        {/* Accessibility Presets: Load OpenDyslexic from CDN */}
        <link
          href="https://fonts.cdnfonts.com/css/opendyslexic"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}