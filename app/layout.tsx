import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex.AI - Bot Hunter",
  description: "Mantle Network Turing Test Trading Bot",
};

import ParticleNetwork from "./components/ParticleNetwork";
import { WalletProvider } from "./components/WalletProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WalletProvider>
          <ParticleNetwork />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
