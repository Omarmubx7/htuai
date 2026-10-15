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
        <div className="min-h-screen flex items-center justify-center bg-[#edf1f6] px-4">
            <form onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-6 rounded-2xl border border-[#dde3ec] bg-white p-8 shadow-xl shadow-[#222d32]/5">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#dc4835]/20 bg-[#dc4835]/10">
                        <KeyRound className="h-5 w-5 text-[#dc4835]" />
                    </div>
                    <h1 className="text-lg font-bold text-[#222d32]">Admin Access</h1>
                    <p className="text-center text-xs text-[#5a6472]">Enter the admin secret to continue</p>
                </div>

                <input
                    type="password"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Admin secret"
                    autoFocus
                    className="w-full rounded-xl border border-[#dde3ec] bg-white px-4 py-3 text-sm text-[#222d32]
                        placeholder:text-[#5a6472]/60 outline-none transition-colors focus:border-[#dc4835]/40 focus:ring-2 focus:ring-[#dc4835]/20"
                    autoComplete="current-password"
                />

                {error && (
                    <div className="flex items-start gap-2 text-xs font-medium text-[#dc4835]" role="status" aria-live="polite">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>{error}</span>
                    </div>
                )}

                {!error && attempted && !verifying && (
                    <p className="text-[11px] leading-relaxed text-[#5a6472]">
                        Forgot the secret? Contact your system admin.
                    </p>
                )}

                {error === 'Admin service is temporarily unavailable' && (
                    <p className="text-[11px] leading-relaxed text-[#5a6472]/80">
                        Try again in a minute, or check that the backend services are online.
                    </p>
                )}

                <button type="submit" disabled={verifying || !input.trim()}
                    className="flex w-full items-center justify-center rounded-xl bg-[#dc4835] py-3 text-sm font-semibold text-white
                        transition-colors hover:bg-[#c03d2e] disabled:cursor-not-allowed disabled:opacity-40">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
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
