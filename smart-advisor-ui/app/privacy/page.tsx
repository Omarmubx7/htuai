import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText, Share2, UserCheck, RefreshCw } from "lucide-react";
import Image from "next/image";
import BrandMark from "@/components/BrandMark";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "MUBXAI Privacy Policy — how we collect, use, store, and protect your academic data and Google user data. Compliant with Google API Services User Data Policy.",
    openGraph: {
        title: "Privacy Policy | MUBXAI",
        description: "Learn how MUBXAI protects your academic data and Google integrations. No selling, no training, no third-party sharing.",
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />

            <main className="max-w-4xl mx-auto px-6 py-20 relative z-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Tracker
                </Link>

                <header className="space-y-4 mb-16">
                    <div className="flex items-center gap-4">
                        <BrandMark size="lg" />
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Last updated: February 27, 2026</p>
                </header>

                <div id="privacy-content" className="space-y-12 text-white/70 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-violet-400" /> 1. Data Collection
                        </h2>
                        <p>
                            MUBXAI collects minimal information necessary to provide academic tracking services:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                            <li><span className="text-white font-bold">Account Data:</span> University ID and progress logs.</li>
                            <li><span className="text-white font-bold">Google User Data:</span> When you authorize integrations, we access your <span className="text-white font-semibold">Google Calendar</span> to push study session and exam events.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 text-sm">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <EyeOff className="w-5 h-5 text-violet-400" /> 2. Data Usage & Processing
                        </h2>
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl shadow-violet-500/5">
                            <p className="text-white/80">
                                How we use, process, and handle the <span className="text-violet-400 font-bold">Google user data</span> we access:
                            </p>
                            <ul className="list-disc pl-6 space-y-3">
                                <li><span className="text-white font-bold">Personalized Scheduling:</span> We process your course dates to create calendar events for midterm and final exams. We do not read or modify unrelated calendar events.</li>
                                <li><span className="text-white font-bold">Limited Scope:</span> We only request the minimum permissions (scopes) required to perform these specific actions.</li>
                            </ul>

                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 leading-relaxed">
                                <span className="font-bold text-white block mb-1">Google Limited Use Disclosure:</span>
                                MUBXAI&apos;s use and transfer to any other app of information received from Google APIs will adhere to{" "}
                                <a
                                    href="https://developers.google.com/terms/api-services-user-data-policy#limited-use-requirements"
                                    target="_blank"
                                    className="underline hover:text-white transition-colors"
                                >
                                    Google API Services User Data Policy
                                </a>,
                                including the Limited Use requirements.
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-violet-400" /> 3. Data Sharing, Transfer & Disclosure
                        </h2>
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl shadow-violet-500/5">
                            <p className="text-white/80 text-sm">
                                MUBXAI is committed to protecting your data. We are transparent about how your <span className="text-violet-400 font-bold">Google user data</span> is handled:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-white font-bold">No Selling or Renting:</span> We do not sell, rent, or trade your Google user data to any third parties, advertisers, or data brokers.</li>
                                <li><span className="text-white font-bold">No Third-Party Sharing:</span> We do not share your Google user data with third-party companies, organizations, or individuals, except as described below.</li>
                                <li><span className="text-white font-bold">No AI Training:</span> Your Google user data is never used to train artificial intelligence or machine learning models.</li>
                                <li><span className="text-white font-bold">Service Providers:</span> The only transfer of your Google data is back to Google itself, through the Google Calendar API, to create exam and study session events on your behalf. No other service providers receive your Google user data.</li>
                                <li><span className="text-white font-bold">No Advertising:</span> Your Google user data is never used for serving advertisements, including retargeting, personalized, or interest-based advertising.</li>
                                <li><span className="text-white font-bold">No Human Reading:</span> MUBXAI employees and contractors do not read your Google user data unless you have given explicit, affirmative consent for a specific purpose (e.g., debugging an issue you reported), it is necessary for security purposes, or it is required by law.</li>
                                <li><span className="text-white font-bold">Legal Requirements:</span> We may disclose your data if required to do so by law or in response to valid legal requests by public authorities (e.g., a court order or government agency).</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400" /> 4. Data Storage & Security
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We prioritize the security of your academic data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm">
                                <li><span className="text-white font-bold">Local Encryption:</span> All authentication tokens for Google services are stored securely in our encrypted database.</li>
                                <li><span className="text-white font-bold">No Data Selling:</span> We do not sell, rent, or trade your academic or personal data to third parties or AI training models.</li>
                                <li><span className="text-white font-bold">Server Security:</span> Our infrastructure uses modern industry-standard security protocols to prevent unauthorized access.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-violet-400" /> 5. Data Retention & Deletion
                        </h2>
                        <div className="space-y-4">
                            <p>
                                You maintain complete control over your information:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-white font-bold">Retention Period:</span> We retain your personal data and tokens only for as long as your account is active or as needed to provide you with our services.</li>
                                <li><span className="text-white font-bold">Self-Service Deletion:</span> You can delete your account and all associated data instantly through the &quot;Settings&quot; menu in the dashboard.</li>
                                <li><span className="text-white font-bold">Deletion Requests:</span> You may email <span className="text-violet-400 font-bold">omarmubaidincs@gmail.com</span> to request complete data removal. We honor all requests within 30 days.</li>
                                <li><span className="text-white font-bold">Token Revocation:</span> Disconnecting an integration immediately deletes the associated OAuth tokens from our systems.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-violet-400" /> 6. Your Rights &amp; Controls
                        </h2>
                        <div className="space-y-4">
                            <p>
                                You have the following rights regarding your data:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-white font-bold">Access:</span> You can request a copy of the personal data we hold about you by emailing <span className="text-violet-400 font-bold">omarmubaidincs@gmail.com</span>.</li>
                                <li><span className="text-white font-bold">Correction:</span> You can request correction of any inaccurate personal data.</li>
                                <li><span className="text-white font-bold">Deletion:</span> You can delete your account and all data through Settings, or request deletion via email.</li>
                                <li><span className="text-white font-bold">Withdraw Consent:</span> You can revoke MUBXAI&apos;s access to your Google account at any time through your <a href="https://myaccount.google.com/permissions" target="_blank" className="text-violet-400 hover:text-violet-300 underline transition-colors">Google Account Permissions</a> page or by disconnecting the integration in your MUBXAI dashboard.</li>
                                <li><span className="text-white font-bold">Object to Processing:</span> You can object to specific data processing activities by contacting us.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-violet-400" /> 7. Changes to This Policy
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We may update this privacy policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons.
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-white font-bold">Notification:</span> We will notify you of any material changes by updating the &quot;Last updated&quot; date at the top of this page and, where feasible, by providing prominent in-app notification.</li>
                                <li><span className="text-white font-bold">Consent for New Data Use:</span> If we change how we use your Google user data, we will obtain your explicit consent before implementing such changes.</li>
                                <li><span className="text-white font-bold">Continued Use:</span> Your continued use of MUBXAI after a policy update constitutes acceptance of the updated terms.</li>
                            </ul>
                        </div>
                    </section>

                    <footer className="pt-12 border-t border-white/5">
                        <p id="contact-info" className="text-sm">
                            If you have any questions about this policy, or if you would like to request data deletion, please contact us at{" "}
                            <a href="mailto:omarmubaidincs@gmail.com" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
                                omarmubaidincs@gmail.com
                            </a>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
