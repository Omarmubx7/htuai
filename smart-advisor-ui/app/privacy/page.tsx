import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText } from "lucide-react";
import Image from "next/image";

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
                        <div className="relative group/logo">
                            <div className="absolute -inset-2 bg-violet-500/20 rounded-2xl blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                            <Image src="/htuai-dark-logo.svg" alt="HTUAI Logo" width={48} height={48} className="relative z-10 dark-logo" />
                            <Image src="/htuai-light-logo.svg" alt="HTUAI Logo" width={48} height={48} className="relative z-10 light-logo" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Last updated: February 21, 2026</p>
                </header>

                <div id="privacy-content" className="space-y-12 text-white/70 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-violet-400" /> 1. Data Collection
                        </h2>
                        <p>
                            HTUAI collects minimal information necessary to provide academic tracking services:
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
                                HTUAI's use and transfer to any other app of information received from Google APIs will adhere to{" "}
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
                            <FileText className="w-5 h-5 text-violet-400" /> 3. Data Storage & Security
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
                            <ShieldCheck className="w-5 h-5 text-violet-400" /> 4. Data Retention & Deletion
                        </h2>
                        <div className="space-y-4">
                            <p>
                                You maintain complete control over your information:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 text-sm">
                                <li><span className="text-white font-bold">Retention Period:</span> We retain your personal data and tokens only for as long as your account is active or as needed to provide you with our services.</li>
                                <li><span className="text-white font-bold">Self-Service Deletion:</span> You can delete your account and all associated data instantly through the "Settings" menu in the dashboard.</li>
                                <li><span className="text-white font-bold">Deletion Requests:</span> You may email <span className="text-violet-400 font-bold">omarmubaidincs@gmail.com</span> to request complete data removal. We honor all requests within 30 days.</li>
                                <li><span className="text-white font-bold">Token Revocation:</span> Disconnecting an integration immediately deletes the associated OAuth tokens from our systems.</li>
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
