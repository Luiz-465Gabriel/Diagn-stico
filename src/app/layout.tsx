import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "EMPMED Propostas",
  description: "Diagnóstico e propostas da EMPMED Assessoria Contábil.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
