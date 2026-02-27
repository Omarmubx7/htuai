import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";
import MobileNav from "@/components/MobileNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://htuai.mubx.dev'),
  title: {
    default: "HTUAI — Smart Academic Tracker for HTU Students",
    template: "%s | HTUAI",
  },
  description: "The #1 free academic tracking platform for Al Hussein Technical University (HTU) students in Jordan. Track courses, calculate GPA & CGPA, plan semesters, check prerequisites, and monitor your degree progress — from 0 to graduation.",
  keywords: [
    // English core
    "HTUAI", "HTU", "Al Hussein Technical University", "HTU course tracker",
    "HTU student portal", "HTU GPA calculator", "HTU academic advisor",
    "HTU degree progress", "HTU semester planner", "HTU prerequisites",
    "HTU credit hours", "HTU curriculum", "HTU courses",
    // Long-tail English
    "HTU computer science courses", "HTU engineering curriculum",
    "university course tracker Jordan", "college GPA calculator free",
    "academic progress tracker", "degree completion tracker",
    "semester planner for university students",
    "prerequisite checker university", "CGPA calculator Jordan",
    // Arabic keywords
    "جامعة الحسين التقنية", "حاسبة المعدل التراكمي",
    "تتبع المواد الجامعية", "جدول الفصل الدراسي",
    "خطة دراسية", "الساعات المعتمدة", "المتطلبات السابقة",
    "التعليم العالي الأردن", "طلاب الجامعة",
    // Brand & category
    "Jordan Higher Education", "free student tools",
    "academic planning app", "university tools Jordan",
  ],
  authors: [{ name: "Omar Mubaidin", url: "https://mubx.dev" }],
  creator: "Omar Mubaidin",
  publisher: "HTUAI",
  alternates: {
    canonical: "https://htuai.mubx.dev",
    languages: {
      "en": "https://htuai.mubx.dev",
      "ar": "https://htuai.mubx.dev",
    },
  },
  openGraph: {
    title: "HTUAI — Smart Academic Tracker for HTU Students",
    description: "Track courses, calculate GPA, plan semesters & monitor degree progress. Free for all Al Hussein Technical University students.",
    url: "https://htuai.mubx.dev",
    siteName: "HTUAI",
    locale: "en_US",
    alternateLocale: "ar_JO",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HTUAI — Smart Academic Tracker for Al Hussein Technical University Students",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HTUAI — Smart Academic Tracker",
    description: "The #1 free course tracker & GPA calculator for HTU students in Jordan. Track 160+ credit hours to graduation.",
    images: ["/og-image.png"],
    creator: "@omarmubaidin",
  },
  icons: {
    icon: [
      { url: "/htuai-light-favicon.ico", media: "(prefers-color-scheme: light)" },
      { url: "/htuai-dark-favicon.ico", media: "(prefers-color-scheme: dark)" }
    ],
    apple: "/htuai-dark-favicon.ico",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
  verification: {},
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('htuai-theme');if(t==='light')document.documentElement.classList.add('light-theme');}catch(e){}`
          }}
        />
      </head>
      <body className={`${outfit.className} min-h-screen flex flex-col pb-[120px] sm:pb-0`}>
        <ThemeProvider>
          <Providers>
            {/* JSON-LD: SoftwareApplication */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": "HTUAI",
                  "url": "https://htuai.mubx.dev",
                  "operatingSystem": "Web",
                  "applicationCategory": "EducationalApplication",
                  "applicationSubCategory": "Academic Planning",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  },
                  "description": "The #1 free academic tracking platform for Al Hussein Technical University (HTU) students. Track courses, calculate CGPA, plan semesters, check prerequisites, and monitor degree progress.",
                  "featureList": [
                    "Course completion tracking with prerequisites",
                    "Real-time GPA & CGPA calculator",
                    "Semester planner with grade prediction",
                    "Degree progress monitoring",
                    "Study session logging with gamification",
                    "Google Calendar integration",
                    "Support for all HTU engineering & CS majors",
                    "Course notes editor"
                  ],
                  "screenshot": "https://htuai.mubx.dev/og-image.png",
                  "author": {
                    "@type": "Person",
                    "name": "Omar Mubaidin",
                    "url": "https://mubx.dev"
                  },
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.8",
                    "ratingCount": "50",
                    "bestRating": "5"
                  },
                  "inLanguage": ["en", "ar"],
                })
              }}
            />

            {/* JSON-LD: FAQPage — drives AEO (AI answer engines, Featured Snippets) */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "What is HTUAI?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "HTUAI is a free academic tracking platform built specifically for Al Hussein Technical University (HTU) students in Jordan. It helps students track their course completion, calculate GPA and CGPA, plan semesters, check prerequisites, and monitor their overall degree progress from enrollment to graduation."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How do I track my courses at HTU?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Sign up on HTUAI, select your major (Computer Science, AI, Cybersecurity, etc.), and you'll see your full curriculum. Tap any course to mark it as completed and set your grade. The app automatically calculates your GPA, tracks prerequisites, and shows your remaining credit hours."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What majors does HTUAI support?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "HTUAI supports all majors at Al Hussein Technical University including Computer Science, Artificial Intelligence, Cybersecurity, Software Engineering, Data Science, and all engineering programs. Each major has its complete curriculum with prerequisites and credit hour requirements."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Is HTUAI free to use?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, HTUAI is 100% free for all HTU students. There are no premium tiers, subscriptions, or hidden fees. All features including course tracking, GPA calculation, semester planning, and Google Calendar integration are available at no cost."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How does the CGPA calculator work in HTUAI?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "HTUAI calculates your True CGPA by combining your tracked course grades with any previous academic history you enter. It uses the standard 4.0 scale and accounts for credit hour weighting. You can also predict how future grades will affect your CGPA using the Semester Planner."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "ما هو HTUAI؟",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "HTUAI هو منصة تتبع أكاديمي مجانية مصممة خصيصاً لطلاب جامعة الحسين التقنية في الأردن. يساعد الطلاب على تتبع إتمام المواد، حساب المعدل التراكمي، تخطيط الفصول الدراسية، التحقق من المتطلبات السابقة، ومراقبة تقدمهم الأكاديمي من القبول حتى التخرج."
                      }
                    }
                  ]
                })
              }}
            />

            {/* JSON-LD: Organization — brand entity for GEO */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  "name": "HTUAI",
                  "url": "https://htuai.mubx.dev",
                  "logo": "https://htuai.mubx.dev/htuai-dark-logo.svg",
                  "description": "Free academic tools for Al Hussein Technical University students in Jordan.",
                  "founder": {
                    "@type": "Person",
                    "name": "Omar Mubaidin",
                    "url": "https://mubx.dev"
                  },
                  "sameAs": [
                    "https://mubx.dev"
                  ],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "omarmubaidincs@gmail.com",
                    "contactType": "customer support"
                  }
                })
              }}
            />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <MobileNav />
          </Providers>
        </ThemeProvider>
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
