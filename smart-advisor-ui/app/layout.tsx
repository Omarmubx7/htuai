import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HTU Courses Tracker",
  description: "Track your HTU course progress and plan your semester.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Silent logging
  try {
    const info = await getClientInfo();
    // Fire and forget - don't await the DB insert to avoid blocking
    logVisitor(info).catch(e => console.error("Logging failed", e));
  } catch (e) {
    // Ignore errors to not break the app
  }

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <footer className="fixed bottom-4 left-0 right-0 px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20 select-none z-50 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy</a>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <a href="/terms" className="hover:text-white/40 transition-colors">Terms</a>
          </div>
          <div className="pointer-events-auto">
            Made by{' '}
            <a
              href="https://mubx.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors"
            >
              mubx
            </a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
