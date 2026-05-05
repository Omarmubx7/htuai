import Link from "next/link";
import { ArrowLeft, Sparkles, Brain, ShieldCheck, Cpu, Info, MessageSquare, Zap } from "lucide-react";
import Image from "next/image";

export default function AITransparencyPage() {
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
                            <Image src="/mubxai-dark-logo.svg" alt="MUBXAI Logo" width={48} height={48} className="relative z-10 dark-logo" />
                            <Image src="/mubxai-light-logo.svg" alt="MUBXAI Logo" width={48} height={48} className="relative z-10 light-logo" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            AI Transparency
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium">Commitment to Open & Responsible AI at MUBXAI</p>
                </header>

                <div className="space-y-12 text-white/70 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Info className="w-5 h-5 text-violet-400" /> 1. Our AI Philosophy
                        </h2>
                        <p>
                            At MUBXAI, we believe that Artificial Intelligence should be a supportive partner in your academic journey. We use AI to simplify complex university processes, provide personalized insights, and help you focus on what matters: learning.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-violet-400" /> 2. AI Services We Use
                        </h2>
                        <div className="glass-card-premium p-8 rounded-3xl border border-white/5 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                                    <Sparkles className="w-6 h-6 text-violet-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white">Google Gemini</h3>
                                    <p className="text-sm">
                                        MUBXAI integrates <span className="text-white font-semibold">Google Gemini</span> (Pro and Flash models) to power our most intelligent features. Gemini provides the reasoning capabilities behind our academic advising and content summarization.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-violet-300 font-bold text-xs uppercase tracking-wider">
                                        <Brain className="w-4 h-4" /> Academic Advisor
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Analyzes your degree progress and curriculum rules to provide optimized course suggestions and prerequisite warnings.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                                        <Zap className="w-4 h-4" /> Smart Notes
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Powers the summarization and auto-generation features in the course notes editor to help you organize study material faster.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-violet-400" /> 3. Data Privacy & AI
                        </h2>
                        <div className="space-y-4">
                            <p>
                                Your privacy is our priority. How your data interacts with our AI services:
                            </p>
                            <ul className="list-disc pl-6 space-y-4 text-sm">
                                <li>
                                    <span className="text-white font-bold">No Training:</span> 
                                    We do not use your personal data, academic records, or notes to train global AI models. Your information stays private to your account.
                                </li>
                                <li>
                                    <span className="text-white font-bold">Anonymous Processing:</span> 
                                    When data is sent to AI models for processing (like summarizing a note), it is stripped of personally identifiable information where possible.
                                </li>
                                <li>
                                    <span className="text-white font-bold">Limited Retention:</span> 
                                    Service providers like Google Cloud (supporting Gemini) do not retain your data beyond the processing required for your request, in accordance with their enterprise privacy terms.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-violet-400" /> 4. Human in the Loop
                        </h2>
                        <p className="text-sm">
                            AI-generated content and academic advice are intended to be supportive tools. While we strive for absolute accuracy, <span className="text-white font-bold">AI can sometimes make mistakes.</span> We always encourage students to verify AI-generated academic advice with official HTU curriculum documents or their faculty advisors.
                        </p>
                    </section>

                    <footer className="pt-12 border-t border-white/5">
                        <p className="text-sm">
                            If you have questions about our use of AI or need further clarification, please contact us at{" "}
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
