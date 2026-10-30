import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { CORE_FAQ, faqSchema } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      {/* FAQPage is only emitted on the homepage because the FAQ is visible there. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            ...faqSchema(CORE_FAQ),
          }),
        }}
      />
      <HomeClient />
    </>
  );
}
