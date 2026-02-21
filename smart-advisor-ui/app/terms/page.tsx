import Link from "next/link";
import { ArrowLeft, Scale, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

export default function TermsPage() {
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
                            <Scale className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Terms of Service
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Last updated: February 21, 2026</p>
                </header>

                <div className="space-y-12 text-white/70 leading-relaxed">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-violet-400" /> Acceptance of Terms
                        </h2>
                        <p>
                            By using HTU Courses Tracker (the &quot;Service&quot;), you agree to be bound by these Terms of Service. This Service is provided for educational organization purposes for students.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-violet-400" /> Use of Service
                        </h2>
                        <p>
                            You agree to use the Service only for lawful purposes. You are responsible for maintaining the confidentiality of your academic data and any integration tokens you choose to generate.
                        </p>
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Disclaimer</h3>
                            <p className="text-sm">
                                While we strive for 100% accuracy, the course data and graduation requirements are provided &quot;as is.&quot; Users should always cross-reference their progress with official University records.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-violet-400" /> External Integrations
                        </h2>
                        <p>
                            Our integrations with Notion and Google Calendar are optional features. Use of these features is subject to the respective terms and privacy policies of Notion Labs, Inc. and Google LLC.
                        </p>
                    </section>

                    <footer className="pt-12 border-t border-white/5">
                        <p className="text-sm">
                            For any inquiries regarding these terms, please contact our support team at{" "}
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
