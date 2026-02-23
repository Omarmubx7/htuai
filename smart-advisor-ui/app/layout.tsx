import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://htuai.mubx.dev'),
  title: "HTUAI — Academic Planner & Course Tracker",
  description: "The ultimate tool for HTU students to track degree progress, plan semesters, and calculate GPA. Built for Al Hussein Technical University (Jordan).",
  keywords: [
    "HTU",
    "Al Hussein Technical University",
    "HTU Courses Tracker",
    "HTUAI",
    "Academic Planner Jordan",
    "GPA Calculator HTU",
    "Semester Planner",
    "جامعة الحسين التقنية",
    "مرشد أكاديمي",
    "حساب المعدل HTU",
    "Jordan Higher Education"
  ],
  authors: [{ name: "mubx", url: "https://mubx.dev" }],
  creator: "mubx",
  openGraph: {
    title: "HTUAI — Academic Planner",
    description: "Track your HTU courses and degree progress with ease.",
    url: "https://htuai.mubx.dev",
    siteName: "HTUAI",
    locale: "ar_JO",
    type: "website",
    images: [
      {
        url: "/HTUAIlogo.svg",
        width: 1200,
        height: 630,
        alt: "HTU Smart Advisor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HTUAI",
    description: "The official course tracker & planner for HTU students.",
    images: ["/HTUAIlogo.svg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/HTUAIlogo.svg",
  },
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
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "HTUAI",
                "operatingSystem": "Web",
                "applicationCategory": "EducationalApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "JOD"
                },
                "description": "Comprehensive academic advisor and course tracker for Al Hussein Technical University (HTU) students in Jordan.",
                "author": {
                  "@type": "Person",
                  "name": "mubx",
                  "url": "https://mubx.dev"
                },
                "inLanguage": ["en", "ar"],
              })
            }}
          />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </Providers>
        <footer className="w-full px-6 py-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-white/20 select-none border-t border-white/5 bg-black/20 backdrop-blur-sm z-50">
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-white/40 transition-colors pointer-events-auto">Privacy</a>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <a href="/terms" className="hover:text-white/40 transition-colors pointer-events-auto">Terms</a>
          </div>
          <div className="flex items-center gap-2">
            <span>Made with ❤️ by</span>
            <a
              href="https://mubx.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors pointer-events-auto"
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
