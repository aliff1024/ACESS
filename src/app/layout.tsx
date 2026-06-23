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

const themeScript = `
  try {
    const stored = localStorage.getItem('acess_accessibility_settings');
    let theme = 'system';
    let bgTint = 'white';
    if (stored) {
      const parsed = JSON.parse(stored);
      theme = parsed.preferred_theme || 'light';
      bgTint = parsed.background_tint || 'white';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-preset', parsed.active_preset || 'none');
      if (parsed.high_contrast) document.documentElement.setAttribute('data-high-contrast', 'true');
      if (parsed.preferred_font) document.documentElement.setAttribute('data-font-type', parsed.preferred_font);
      if (parsed.font_family) document.documentElement.setAttribute('data-font-family', parsed.font_family);
      if (parsed.background_tint) document.documentElement.setAttribute('data-bg-tint', parsed.background_tint);
    }
    const isDarkPreset = bgTint.startsWith('dark_');
    if (theme === 'dark' || isDarkPreset) {
      document.documentElement.classList.add('dark');
    } else if (theme === 'high_contrast' || theme === 'light' || theme === 'soft') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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