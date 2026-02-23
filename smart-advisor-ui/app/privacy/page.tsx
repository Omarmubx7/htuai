import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText } from "lucide-react";

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
                            <img src="/HTUAIlogo.svg" alt="HTUAI" className="w-12 h-12 relative z-10" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Last updated: February 21, 2026</p>
                </header>

                <div id="privacy-content" className="space-y-12 text-white/70 leading-relaxed">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-violet-400" /> Data Collection
                        </h2>
                        <p>
                            HTUAI is designed to help students organize their academic journey. We collect minimal data necessary to provide our services, including your University ID, major, and course progress.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <EyeOff className="w-5 h-5 text-violet-400" /> Third-Party Integrations & Data Usage
                        </h2>
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl shadow-violet-500/5">
                            <p>
                                When you choose to use our integrations, we handle your data with extreme care. We use Google user data to enhance your academic planning:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm">
                                <li><span className="text-white font-bold">Google Calendar:</span> We only request permission to add midterm and final exam dates to your primary calendar. This allows you to have a unified academic schedule.</li>
                                <li><span className="text-white font-bold">Google Sheets:</span> We only access spreadsheets created by the integration to sync your planner data. This enables you to export and manage your data in a familiar spreadsheet format.</li>
                            </ul>
                            <p className="text-xs text-white/40 italic">
                                We do not store your external passwords. All connections are handled via secure OAuth tokens. We do not share this data with third parties.
                            </p>
                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 leading-relaxed">
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
                            <ShieldCheck className="w-5 h-5 text-violet-400" /> Data Retention & Deletion
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We retain your personal data for as long as your account is active or as needed to provide you with our services.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm">
                                <li><span className="text-white font-bold">Account Deletion:</span> You can delete your account and all associated data at any time through the application settings.</li>
                                <li><span className="text-white font-bold">Data Removal Requests:</span> You may also request the deletion of your data by contacting us directly. We will process these requests within 30 days.</li>
                                <li><span className="text-white font-bold">OAuth Disconnection:</span> Disconnecting a third-party service (like Google Calendar) will immediately stop our access to that service's data, and we will delete any associated temporary tokens.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400" /> Data Protection
                        </h2>
                        <p>
                            Your progress data is stored securely in our database. We do not sell, rent, or trade your personal information with third parties. Your academic data is yours alone.
                        </p>
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
