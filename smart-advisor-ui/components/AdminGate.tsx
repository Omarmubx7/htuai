'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';

const AdminSecretContext = createContext<string>('');
export const useAdminSecret = () => useContext(AdminSecretContext);

export default function AdminGate({ children }: { children: ReactNode }) {
    const [secret, setSecret] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('admin_secret');
        }
        return null;
    });
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setVerifying(true);
        setError('');
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-secret': input.trim() }
            });
            if (res.ok) {
                sessionStorage.setItem('admin_secret', input.trim());
                setSecret(input.trim());
            } else {
                setError('Invalid admin secret');
            }
        } catch {
            setError('Connection failed');
        }
        setVerifying(false);
    };

    if (!secret) return (
        <div className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)' }}>
            <form onSubmit={handleSubmit}
                className="w-full max-w-sm p-8 rounded-2xl space-y-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(14,14,24,0.9), rgba(10,10,18,0.7))',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <KeyRound className="w-5 h-5 text-violet-400" />
                    </div>
                    <h1 className="text-lg font-bold text-white/80">Admin Access</h1>
                    <p className="text-xs text-white/25 text-center">Enter the admin secret to continue</p>
                </div>

                <input
                    type="password"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Admin secret"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none
                        border border-white/[0.06] focus:border-violet-500/30 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                />

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400/80">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {error}
                    </div>
                )}

                <button type="submit" disabled={verifying || !input.trim()}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200
                        disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                        color: 'white',
                    }}>
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Unlock'}
                </button>
            </form>
        </div>
    );

    return (
        <AdminSecretContext.Provider value={secret}>
            {children}
        </AdminSecretContext.Provider>
    );
}
