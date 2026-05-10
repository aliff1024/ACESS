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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}