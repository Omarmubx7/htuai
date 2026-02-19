import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HTU Courses Tracker",
  description: "Track your HTU course progress and plan your semester.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <footer className="fixed bottom-4 left-0 right-0 text-center text-xs text-white/20 select-none z-50 pointer-events-none">
          Made by{' '}
          <a
            href="https://mubx.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 pointer-events-auto transition-colors font-medium"
          >
            mubx
          </a>
        </footer>
      </body>
    </html>
  );
}
