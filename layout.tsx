import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivarAşk — Yakınındaki Aşkı Bul | 123.000 Kişi Çevrimiçi",
  description: "Dullar, bekarlar, sevgili arayanlar, evlilik isteyenler ve gizli kaçamak arayanlar için Türkiye'nin civar tanışma platformu. 18+ özel alan ön onayla açılır.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="text-slate-900 antialiased">{children}</body>
    </html>
  );
}
