import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getClientInfo } from "@/lib/client-info";
import { logVisitor } from "@/lib/database";
import { Providers } from "@/components/Providers";
import MobileNav from "@/components/MobileNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteFooter from "@/components/SiteFooter";

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
  const info = await getClientInfo().catch(() => null);
  if (info) {
    // Fire and forget - don't await the DB insert to avoid blocking
    logVisitor(info).catch(e => console.error("Logging failed", e));
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta
          name="google-site-verification"
          content="AwC38xmOqbq4byFRJWpR_VackCRoayOpOIJe_cQV6GM"
        />
        <script
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

              try{
                var storage=window.localStorage;
                if(isStorageLike(storage)){
                  var t=storage.getItem("htuai-theme");
                  if(t==="light")document.documentElement.classList.add("light-theme");
                }
              }catch(e){}
            })();`
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
            <SiteFooter />
          </Providers>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
