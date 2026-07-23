import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";
import MobileNav from "@/components/MobileNav";
import MobileHeader from "@/components/MobileHeader";
import ThemeProvider from "@/components/ThemeProvider";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
export const metadata: Metadata = {
  metadataBase: new URL('https://ai.mubx.dev'),
  title: {
    default: "MUBXAI — Smart Academic Tracker for MUBX Students",
    template: "%s | MUBXAI",
  },
  description: "The #1 free academic tracking platform for MUBX University (MUBX) students in Jordan. Track courses, calculate GPA & CGPA, plan semesters, check prerequisites, and monitor your degree progress — from 0 to graduation.",
  keywords: [
    // English core
    "MUBXAI", "MUBX", "MUBX University", "MUBX course tracker",
    "MUBX student portal", "MUBX GPA calculator", "MUBX academic advisor",
    "MUBX degree progress", "MUBX semester planner", "MUBX prerequisites",
    "MUBX credit hours", "MUBX curriculum", "MUBX courses",
    // Long-tail English
    "MUBX computer science courses", "MUBX engineering curriculum",
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
  publisher: "MUBXAI",
  alternates: {
    canonical: "https://ai.mubx.dev",
    languages: {
      "en": "https://ai.mubx.dev",
      "ar": "https://ai.mubx.dev",
    },
  },
  openGraph: {
    title: "MUBXAI — Smart Academic Tracker for MUBX Students",
    description: "Track courses, calculate GPA, plan semesters & monitor degree progress. Free for all MUBX University students.",
    url: "https://ai.mubx.dev",
    siteName: "MUBXAI",
    locale: "en_US",
    alternateLocale: "ar_JO",
    type: "website",
    images: [
      {
        url: "/mubxai-og-image.png",
        width: 1200,
        height: 630,
        alt: "MUBXAI — Smart Academic Tracker for MUBX University Students",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUBXAI — Smart Academic Tracker",
    description: "The #1 free course tracker & GPA calculator for MUBX students in Jordan. Track 160+ credit hours to graduation.",
    images: ["/mubxai-og-image.png"],
    creator: "@omarmubaidin",
  },
  icons: {
    icon: [
      { url: "/mubxai-light-favicon.ico", media: "(prefers-color-scheme: light)" },
      { url: "/mubxai-dark-favicon.ico", media: "(prefers-color-scheme: dark)" }
    ],
    apple: "/mubxai-dark-logo.png",
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
  verification: {
    google: "AwC38xmOqbq4byFRJWpR_VackCRoayOpOIJe_cQV6GM",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const info = await getClientInfo().catch(() => null);
  if (info) {
    // Fire and forget - don't await the DB insert to avoid blocking
    logVisitor(info).catch(e => console.error("Logging failed", e));
  }

  const hdrs = await headers();
  const nonce = hdrs.get("x-nonce") || undefined;

  return (
    <html lang="en" className="light overflow-x-hidden" suppressHydrationWarning>
      <head>
        <meta
          name="google-site-verification"
          content="AwC38xmOqbq4byFRJWpR_VackCRoayOpOIJe_cQV6GM"
        />
        {/* AI discovery — helps GPTBot, ClaudeBot, Perplexity find structured context */}
        <link rel="prefetch" href="/ai.txt" />
        <link rel="prefetch" href="/llms.txt" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var isStorageLike=function(value){
                return !!value && typeof value.getItem==="function" && typeof value.setItem==="function" && typeof value.removeItem==="function";
              };
              var s=function(e){
                var msg=(e.message||e.reason?.message||"").toLowerCase();
                if(msg.includes("storage")||msg.includes("access")||msg.includes("zap")||msg.includes("clock")||msg.includes("extension")||msg.includes("cactus")){
                  if(e.stopImmediatePropagation)e.stopImmediatePropagation();
                  if(e.preventDefault)e.preventDefault();
                  return true;
                }
              };
              window.addEventListener("error",s,true);
              window.addEventListener("unhandledrejection",s,true);

              var f=function(a){if(!a || typeof a!=="string")return false;var s=a.toLowerCase();return s.includes("zustand")||s.includes("deprecated")||s.includes("extension")||s.includes("storage")||s.includes("access")||s.includes("zap")||s.includes("clock")||s.includes("cactus");};
              var ow=console.warn;console.warn=function(){if(f(arguments[0]))return;ow.apply(console,arguments)};
              var oe=console.error;console.error=function(){if(f(arguments[0]))return;oe.apply(console,arguments)};
              var ol=console.log;console.log=function(){if(f(arguments[0]))return;ol.apply(console,arguments)};
            })();`
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`} suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            {/* JSON-LD: SoftwareApplication */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": "MUBXAI",
                  "url": "https://ai.mubx.dev",
                  "operatingSystem": "Web",
                  "applicationCategory": "EducationalApplication",
                  "applicationSubCategory": "Academic Planning",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  },
                  "description": "The #1 free academic tracking platform for MUBX University (MUBX) students. Track courses, calculate CGPA, plan semesters, check prerequisites, and monitor degree progress.",
                  "featureList": [
                    "Course completion tracking with prerequisites",
                    "Real-time GPA & CGPA calculator",
                    "Semester planner with grade prediction",
                    "Degree progress monitoring",
                    "Study session logging with gamification",
                    "Google Calendar integration",
                    "Support for all MUBX engineering & CS majors",
                    "Course notes editor"
                  ],
                  "screenshot": "https://ai.mubx.dev/mubxai-og-image.png",
                  "author": {
                    "@type": "Person",
                    "name": "Omar Mubaidin",
                    "url": "https://mubx.dev"
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
                      "name": "What is MUBXAI?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "MUBXAI is a free academic tracking platform built specifically for MUBX University (MUBX) students in Jordan. It helps students track their course completion, calculate GPA and CGPA, plan semesters, check prerequisites, and monitor their overall degree progress from enrollment to graduation."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How do I track my courses at MUBX?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Sign up on MUBXAI, select your major (Computer Science, AI, Cybersecurity, etc.), and you'll see your full curriculum. Tap any course to mark it as completed and set your grade. The app automatically calculates your GPA, tracks prerequisites, and shows your remaining credit hours."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What majors does MUBXAI support?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "MUBXAI supports all majors at MUBX University including Computer Science, Artificial Intelligence, Cybersecurity, Software Engineering, Data Science, and all engineering programs. Each major has its complete curriculum with prerequisites and credit hour requirements."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Is MUBXAI free to use?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, MUBXAI is 100% free for all MUBX students. There are no premium tiers, subscriptions, or hidden fees. All features including course tracking, GPA calculation, semester planning, and Google Calendar integration are available at no cost."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How does the CGPA calculator work in MUBXAI?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "MUBXAI calculates your True CGPA by combining your tracked course grades with any previous academic history you enter. It uses the standard 4.0 scale and accounts for credit hour weighting. You can also predict how future grades will affect your CGPA using the Semester Planner."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "ما هو MUBXAI؟",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "MUBXAI هو منصة تتبع أكاديمي مجانية مصممة خصيصاً لطلاب جامعة الحسين التقنية في الأردن. يساعد الطلاب على تتبع إتمام المواد، حساب المعدل التراكمي، تخطيط الفصول الدراسية، التحقق من المتطلبات السابقة، ومراقبة تقدمهم الأكاديمي من القبول حتى التخرج."
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
                  "name": "MUBXAI",
                  "url": "https://ai.mubx.dev",
                  "logo": "https://ai.mubx.dev/mubxai-dark-logo.png",
                  "description": "Free academic tools for MUBX University students in Jordan.",
                  "founder": {
                    "@type": "Person",
                    "name": "Omar Mubaidin",
                    "url": "https://mubx.dev"
                  },
                  "sameAs": [
                    "https://mubx.dev",
                    "https://htu.edu.jo"
                  ],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "omarmubaidincs@gmail.com",
                    "contactType": "customer support"
                  }
                })
              }}
            />

            {/* JSON-LD: WebSite — enables sitelinks searchbox in Google */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  "name": "MUBXAI",
                  "alternateName": ["MUBX AI", "HTU Academic Tracker"],
                  "url": "https://ai.mubx.dev",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://ai.mubx.dev/courses/{search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  },
                  "inLanguage": ["en", "ar"],
                })
              }}
            />

            {/* JSON-LD: BreadcrumbList — shows breadcrumb trail in SERPs */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://ai.mubx.dev"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Semester Planner",
                      "item": "https://ai.mubx.dev/planner"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": "Privacy Policy",
                      "item": "https://ai.mubx.dev/privacy"
                    },
                    {
                      "@type": "ListItem",
                      "position": 4,
                      "name": "Terms of Service",
                      "item": "https://ai.mubx.dev/terms"
                    },
                    {
                      "@type": "ListItem",
                      "position": 5,
                      "name": "AI Transparency",
                      "item": "https://ai.mubx.dev/ai-transparency"
                    },
                  ]
                })
              }}
            />
            <MobileHeader />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <MobileNav />
          </Providers>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
