import type { Metadata } from "next";
import { Barlow, Gelasio } from "next/font/google";
import "./globals.css";

// Mêmes polices que l'app mobile et le site bcc73.com.
const barlow = Barlow({
  variable: "--font-barlow",
  weight: "600",
  subsets: ["latin"],
});

const gelasio = Gelasio({
  variable: "--font-gelasio",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BCC73 — Administration",
  description: "Back-office du Badminton Club de Chambéry",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${barlow.variable} ${gelasio.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
