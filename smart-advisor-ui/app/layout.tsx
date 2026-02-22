import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HTU Smart Advisor — Academic Planner & Course Tracker",
  description: "The ultimate tool for HTU students to track degree progress, plan semesters, and calculate GPA. Built for Al Hussein Technical University (Jordan).",
  keywords: [
    "HTU",
    "Al Hussein Technical University",
    "HTU Courses Tracker",
    "HTU Smart Advisor",
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
    title: "HTU Smart Advisor — Academic Planner",
    description: "Track your HTU courses and degree progress with ease.",
    url: "https://htuai.mubx.dev",
    siteName: "HTU Smart Advisor",
    locale: "ar_JO",
    type: "website",
    images: [
      {
        url: "/mubxlogo.svg",
        width: 1200,
        height: 630,
        alt: "HTU Smart Advisor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HTU Smart Advisor",
    description: "The official course tracker & planner for HTU students.",
    images: ["/mubxlogo.svg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/mubxlogo.svg",
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
      <body className={inter.className}>
        <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "HTU Smart Advisor",
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
