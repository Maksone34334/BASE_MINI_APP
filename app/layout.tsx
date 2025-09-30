import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Providers } from './providers'

const APP_URL = 'https://base-mini-app-flame.vercel.app';
const APP_NAME = 'OSINT Mini';

export const metadata: Metadata = {
  title: "OSINT Mini - Base App",
  description: "Professional OSINT intelligence platform built on Base",
  generator: "Base Mini App",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "OSINT Mini - Base App",
    description: "Professional OSINT intelligence platform built on Base",
    images: [`${APP_URL}/images/osint-identity-card.png`],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OSINT Mini - Base App",
    description: "Professional OSINT intelligence platform built on Base",
    images: [`${APP_URL}/images/osint-identity-card.png`],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${APP_URL}/images/osint-identity-card.png`,
      button: {
        title: `Launch ${APP_NAME}`,
        action: {
          type: 'launch_frame',
          name: APP_NAME,
          url: APP_URL
        }
      }
    })
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
