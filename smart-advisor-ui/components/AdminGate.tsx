'use client';

import { createContext, useContext, useState, type ReactNode, type SyntheticEvent } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { safeStorage } from '@/lib/safe-storage';
import { fetchWithRetry } from '@/lib/fetch-retry';

const AdminSecretContext = createContext<string>('');
export const useAdminSecret = () => useContext(AdminSecretContext);

export default function AdminGate({ children }: Readonly<{ children: ReactNode }>) {
    const [secret, setSecret] = useState<string | null>(() => {
        if (globalThis.window === undefined) return null;
        return safeStorage.session.get('admin_secret');
    });

    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;
        setVerifying(true);
        setError('');
        setAttempted(true);
        try {
            const res = await fetchWithRetry('/api/admin/stats', {
                headers: { 'x-admin-secret': input.trim() },
                retries: 1
            });
            if (res.ok) {
                safeStorage.session.set('admin_secret', input.trim());
                setSecret(input.trim());
                setInput('');
            } else {
                setInput('');
                if (res.status >= 500) {
                    setError('Admin service is temporarily unavailable');
                } else {
                    setError('Invalid admin secret');
                }
            }
        } catch (error) {
            console.error('Admin verification failed', error);
            setInput('');
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
                        <KeyRound className="w-5 h-5 text-[#dc4835]" />
                    </div>
                    <h1 className="text-lg font-bold text-[#222d32]">Admin Access</h1>
                    <p className="text-xs text-[#5a6472] text-center">Enter the admin secret to continue</p>
                </div>

                <input
                    type="password"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Admin secret"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none
                        border border-white/6 focus:border-[#dc4835]/30 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    autoComplete="current-password"
                />

                {error && (
                    <div className="flex items-start gap-2 text-xs text-red-400/80" role="status" aria-live="polite">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{error}</span>
                    </div>
                )}

                {!error && attempted && !verifying && (
                    <p className="text-[11px] text-[#5a6472] leading-relaxed">
                        Forgot the secret? Contact your system admin.
                    </p>
                )}

                {error === 'Admin service is temporarily unavailable' && (
                    <p className="text-[11px] text-[#5a6472]/80 leading-relaxed">
                        Try again in a minute, or check that the backend services are online.
                    </p>
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
