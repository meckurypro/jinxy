// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Jinxy',
  description: 'Want a Jinx? Go Jinxy.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Jinxy',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0F',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Jinxy" />
        <meta name="msapplication-TileColor" content="#0A0A0F" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/*
          Fonts are loaded here via <link> tags with preconnect.
          The @import in globals.css has been removed to avoid loading
          the same font twice (which causes a redundant network request
          and delays first paint).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeScript />
        <div id="app-root" className="w-full max-w-app mx-auto min-h-dvh relative">
          {children}
        </div>
        <div id="portal-root" />
      </body>
    </html>
  )
}

// Inline script to set theme before paint — prevents flash of wrong theme
function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('jinxy-theme') || 'dark';
        var mode = localStorage.getItem('jinxy-mode') || 'client';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-mode', mode);
      } catch(e) {}
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
