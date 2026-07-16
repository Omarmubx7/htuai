import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText, Share2, UserCheck, RefreshCw } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "MUBXAI Privacy Policy — how we collect, use, store, and protect your academic data and Google user data. Compliant with Google API Services User Data Policy.",
    alternates: {
        canonical: "https://ai.mubx.dev/privacy",
    },
    openGraph: {
        title: "Privacy Policy | MUBXAI",
        description: "Learn how MUBXAI protects your academic data and Google integrations. No selling, no training, no third-party sharing.",
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#edf1f6] text-[#222d32] selection:bg-[#dc4835]/20 font-sans">
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />

            <main className="max-w-4xl mx-auto px-6 py-20 relative z-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#5a6472] hover:text-[#222d32] transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Tracker
                </Link>

                <header className="space-y-4 mb-16">
                    <div className="flex items-center gap-4">
                        <BrandMark size="lg" />
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#222d32]">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-[#5a6472] font-medium">Last updated: February 27, 2026</p>
                </header>

                <div id="privacy-content" className="space-y-12 text-[#222d32]/80 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <Lock className="w-5 h-5 text-[#dc4835]" /> 1. Data Collection
                        </h2>
                        <p>
                            MUBXAI collects minimal information necessary to provide academic tracking services:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                            <li><span className="text-[#222d32] font-bold">Account Data:</span> University ID and progress logs.</li>
                            <li><span className="text-[#222d32] font-bold">Google User Data:</span> When you authorize integrations, we access your <span className="text-[#222d32] font-semibold">Google Calendar</span> to push study session and exam events.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 text-sm">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <EyeOff className="w-5 h-5 text-[#dc4835]" /> 2. Data Usage & Processing
                        </h2>
                        <div className="bg-white p-6 rounded-3xl border border-[#dde3ec] space-y-4 shadow-sm">
                            <p className="text-[#222d32]/80">
                                How we use, process, and handle the <span className="text-[#dc4835] font-bold">Google user data</span> we access:
                            </p>
                            <ul className="list-disc pl-6 space-y-3">
                                <li><span className="text-[#222d32] font-bold">Personalized Scheduling:</span> We process your course dates to create calendar events for midterm and final exams. We do not read or modify unrelated calendar events.</li>
                                <li><span className="text-[#222d32] font-bold">Limited Scope:</span> We only request the minimum permissions (scopes) required to perform these specific actions.</li>
                            </ul>

                            <div className="p-4 rounded-xl bg-[#dc4835]/5 border border-[#dc4835]/10 text-[11px] text-[#dc4835] leading-relaxed">
                                <span className="font-bold text-[#222d32] block mb-1">Google Limited Use Disclosure:</span>
                                MUBXAI&apos;s use and transfer to any other app of information received from Google APIs will adhere to{" "}
                                <a
                                    href="https://developers.google.com/terms/api-services-user-data-policy#limited-use-requirements"
                                    target="_blank"
                                    className="underline hover:text-[#222d32] transition-colors"
                                >
                                    Google API Services User Data Policy
                                </a>,
                                including the Limited Use requirements.
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-[#dc4835]" /> 3. Data Sharing, Transfer & Disclosure
                        </h2>
                        <div className="bg-white p-6 rounded-3xl border border-[#dde3ec] space-y-4 shadow-sm">
                            <p className="text-[#222d32]/80 text-sm">
                                MUBXAI is committed to protecting your data. We are transparent about how your <span className="text-[#dc4835] font-bold">Google user data</span> is handled:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-[#222d32] font-bold">No Selling or Renting:</span> We do not sell, rent, or trade your Google user data to any third parties, advertisers, or data brokers.</li>
                                <li><span className="text-[#222d32] font-bold">No Third-Party Sharing:</span> We do not share your Google user data with third-party companies, organizations, or individuals, except as described below.</li>
                                <li><span className="text-[#222d32] font-bold">No AI Training:</span> Your Google user data is never used to train artificial intelligence or machine learning models.</li>
                                <li><span className="text-[#222d32] font-bold">Service Providers:</span> The only transfer of your Google data is back to Google itself, through the Google Calendar API, to create exam and study session events on your behalf. No other service providers receive your Google user data.</li>
                                <li><span className="text-[#222d32] font-bold">No Advertising:</span> Your Google user data is never used for serving advertisements, including retargeting, personalized, or interest-based advertising.</li>
                                <li><span className="text-[#222d32] font-bold">No Human Reading:</span> MUBXAI employees and contractors do not read your Google user data unless you have given explicit, affirmative consent for a specific purpose (e.g., debugging an issue you reported), it is necessary for security purposes, or it is required by law.</li>
                                <li><span className="text-[#222d32] font-bold">Legal Requirements:</span> We may disclose your data if required to do so by law or in response to valid legal requests by public authorities (e.g., a court order or government agency).</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#dc4835]" /> 4. Data Storage & Security
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We prioritize the security of your academic data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm">
                                <li><span className="text-[#222d32] font-bold">Local Encryption:</span> All authentication tokens for Google services are stored securely in our encrypted database.</li>
                                <li><span className="text-[#222d32] font-bold">No Data Selling:</span> We do not sell, rent, or trade your academic or personal data to third parties or AI training models.</li>
                                <li><span className="text-[#222d32] font-bold">Server Security:</span> Our infrastructure uses modern industry-standard security protocols to prevent unauthorized access.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-[#dc4835]" /> 5. Data Retention & Deletion
                        </h2>
                        <div className="space-y-4">
                            <p>
                                You maintain complete control over your information:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-[#222d32] font-bold">Retention Period:</span> We retain your personal data and tokens only for as long as your account is active or as needed to provide you with our services.</li>
                                <li><span className="text-[#222d32] font-bold">Self-Service Deletion:</span> You can delete your account and all associated data instantly through the &quot;Settings&quot; menu in the dashboard.</li>
                                <li><span className="text-[#222d32] font-bold">Deletion Requests:</span> You may email <span className="text-[#dc4835] font-bold">omarmubaidincs@gmail.com</span> to request complete data removal. We honor all requests within 30 days.</li>
                                <li><span className="text-[#222d32] font-bold">Token Revocation:</span> Disconnecting an integration immediately deletes the associated OAuth tokens from our systems.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-[#dc4835]" /> 6. Your Rights &amp; Controls
                        </h2>
                        <div className="space-y-4">
                            <p>
                                You have the following rights regarding your data:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-[#222d32] font-bold">Access:</span> You can request a copy of the personal data we hold about you by emailing <span className="text-[#dc4835] font-bold">omarmubaidincs@gmail.com</span>.</li>
                                <li><span className="text-[#222d32] font-bold">Correction:</span> You can request correction of any inaccurate personal data.</li>
                                <li><span className="text-[#222d32] font-bold">Deletion:</span> You can delete your account and all data through Settings, or request deletion via email.</li>
                                <li><span className="text-[#222d32] font-bold">Withdraw Consent:</span> You can revoke MUBXAI&apos;s access to your Google account at any time through your <a href="https://myaccount.google.com/permissions" target="_blank" className="text-[#dc4835] hover:text-[#c03d2e] underline transition-colors">Google Account Permissions</a> page or by disconnecting the integration in your MUBXAI dashboard.</li>
                                <li><span className="text-[#222d32] font-bold">Object to Processing:</span> You can object to specific data processing activities by contacting us.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#222d32] flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-[#dc4835]" /> 7. Changes to This Policy
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We may update this privacy policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons.
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-[#222d32] font-bold">Notification:</span> We will notify you of any material changes by updating the &quot;Last updated&quot; date at the top of this page and, where feasible, by providing prominent in-app notification.</li>
                                <li><span className="text-[#222d32] font-bold">Consent for New Data Use:</span> If we change how we use your Google user data, we will obtain your explicit consent before implementing such changes.</li>
                                <li><span className="text-[#222d32] font-bold">Continued Use:</span> Your continued use of MUBXAI after a policy update constitutes acceptance of the updated terms.</li>
                            </ul>
                        </div>
                    </section>

                    <footer className="pt-12 border-t border-[#dde3ec]">
                        <p id="contact-info" className="text-sm">
                            If you have any questions about this policy, or if you would like to request data deletion, please contact us at{" "}
                            <a href="mailto:omarmubaidincs@gmail.com" className="text-[#dc4835] hover:text-[#c03d2e] font-bold transition-colors">
                                omarmubaidincs@gmail.com
                            </a>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
