import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Providers } from './providers'

export const metadata: Metadata = {
  title: "OSINT Mini - Base App",
  description: "Professional OSINT intelligence platform built on Base",
  generator: "Base Mini App",
  metadataBase: new URL('https://base-mini-app-flame.vercel.app'),
  openGraph: {
    title: "OSINT Mini - Base App",
    description: "Professional OSINT intelligence platform built on Base",
    images: ["/images/og-image.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OSINT Mini - Base App",
    description: "Professional OSINT intelligence platform built on Base",
    images: ["/images/og-image.jpg"],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': '/images/frame-image.jpg',
    'fc:frame:button:1': 'Launch OSINT Mini',
    'fc:frame:post_url': '/api/frame',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0052FF" />
        <meta name="base-mini-app" content="true" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
