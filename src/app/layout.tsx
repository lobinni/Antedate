import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Syne, DM_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400", "600", "700", "800"] });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Antedate — First, on record",
  description:
    "Antedate is a priority registry for ideas and written work on GenLayer Studio Next. Seal a description, let the chain stamp the date, and let validators settle copies.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${syne.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
