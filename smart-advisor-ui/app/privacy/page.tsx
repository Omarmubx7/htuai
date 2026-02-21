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
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Last updated: February 21, 2026</p>
                </header>

                <div className="space-y-12 text-white/70 leading-relaxed">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-violet-400" /> Data Collection
                        </h2>
                        <p>
                            HTU Courses Tracker is designed to help students organize their academic journey. We collect minimal data necessary to provide our services, including your University ID, major, and course progress.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <EyeOff className="w-5 h-5 text-violet-400" /> Third-Party Integrations
                        </h2>
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-4">
                            <p>
                                When you choose to use our integrations, we handle your data with extreme care:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm">
                                <li><span className="text-white font-bold">Notion:</span> We only access the pages you explicitly share with the integration to create your Study Hub.</li>
                                <li><span className="text-white font-bold">Google Calendar:</span> We only request permission to add midterm and final exam dates to your primary calendar.</li>
                            </ul>
                            <p className="text-xs text-white/40 italic">
                                We do not store your external passwords. All connections are handled via secure OAuth tokens.
                            </p>
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
                        <p className="text-sm">
                            If you have any questions about this policy, please contact us at{" "}
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
