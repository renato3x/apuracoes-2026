import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { settings } from "@/lib/tse/endpoints";
import "./globals.css";
const base = process.env.SITE_URL ?? "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: "Apuração 2026 — Resultados das Eleições",
    template: "%s | Apuração 2026",
  },
  description:
    "Acompanhe os resultados das Eleições Gerais de 2026 no Brasil com dados públicos do TSE. Presidente, governadores, Senado e deputados.",
  openGraph: {
    title: "Apuração 2026",
    description: "Resultados eleitorais com dados do TSE, sem projeções.",
    locale: "pt_BR",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  themeColor: "#101414",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Suspense fallback={<div className="header-placeholder" />}>
          <Header
            simulation={settings().mode === "simulation"}
            interval={settings().interval}
          />
        </Suspense>
        <main id="main" className="wrap main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
